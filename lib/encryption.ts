import crypto from 'crypto';

// ---------- Configuration ----------
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;   // 128-bit auth tag
const KEY_LENGTH = 32;        // 256-bit key
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';

// ---------- Key Derivation ----------
const RAW_KEY = process.env.ENCRYPTION_KEY;
const RAW_SALT = process.env.ENCRYPTION_SALT;

if (!RAW_KEY) {
  console.warn('[Encryption] ENCRYPTION_KEY is missing — using build-time fallback');
}
if (!RAW_SALT) {
  console.warn('[Encryption] ENCRYPTION_SALT is missing — using build-time fallback');
}

const ENCRYPTION_KEY_STR = RAW_KEY || 'build-time-fallback-key-never-use-in-production';
const ENCRYPTION_SALT_STR = RAW_SALT || 'build-time-fallback-salt';

let _derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
  if (_derivedKey) return _derivedKey;
  const salt = Buffer.from(ENCRYPTION_SALT_STR, 'hex').length >= 16
    ? Buffer.from(ENCRYPTION_SALT_STR, 'hex')
    : Buffer.from(ENCRYPTION_SALT_STR, 'utf-8');
  _derivedKey = crypto.pbkdf2Sync(
    ENCRYPTION_KEY_STR,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
  return _derivedKey;
}

// ---------- AES-256-GCM Encrypt ----------
export function encryptData(data: any): string {
  if (data === null || data === undefined) return '';
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const jsonStr = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

// ---------- AES-256-GCM Decrypt ----------
export function decryptData(encryptedStr: string): any {
  if (!encryptedStr) return null;

  // Try new AES-256-GCM format first
  try {
    const combined = Buffer.from(encryptedStr, 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      // Too short for GCM format, try legacy
      return legacyDecrypt(encryptedStr);
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    // Fall back to legacy CryptoJS format
    try {
      return legacyDecrypt(encryptedStr);
    } catch (legacyError) {
      console.error('[Encryption] Both GCM and legacy decryption failed:', legacyError);
      return null;
    }
  }
}

// ---------- Legacy CryptoJS AES Decrypt (for migration) ----------
// CryptoJS AES with passphrase produces OpenSSL-compatible format:
// "Salted__" + 8-byte salt + ciphertext (all base64 encoded)
function legacyDecrypt(encryptedStr: string): any {
  try {
    const raw = Buffer.from(encryptedStr, 'base64');

    // CryptoJS passphrase mode uses OpenSSL KDF
    const LEGACY_KEY = RAW_KEY || 'build-time-fallback-never-use-in-prod';

    // Check for "Salted__" prefix (OpenSSL format)
    const header = raw.subarray(0, 8).toString('utf8');
    let key: Buffer, iv: Buffer, ciphertext: Buffer;

    if (header === 'Salted__') {
      const salt = raw.subarray(8, 16);
      ciphertext = raw.subarray(16);
      // OpenSSL EVP_BytesToKey derivation (MD5-based)
      const derived = evpBytesToKey(LEGACY_KEY, salt, 32, 16);
      key = derived.key;
      iv = derived.iv;
    } else {
      // No salt — direct passphrase (unlikely but handle)
      const derived = evpBytesToKey(LEGACY_KEY, Buffer.alloc(0), 32, 16);
      key = derived.key;
      iv = derived.iv;
      ciphertext = raw;
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const text = decrypted.toString('utf8');
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error('[Encryption] Legacy decrypt failed:', e);
    return null;
  }
}

// OpenSSL EVP_BytesToKey implementation (used by CryptoJS passphrase mode)
function evpBytesToKey(
  password: string,
  salt: Buffer,
  keyLen: number,
  ivLen: number
): { key: Buffer; iv: Buffer } {
  const totalLen = keyLen + ivLen;
  const blocks: Buffer[] = [];
  let lastBlock = Buffer.alloc(0);

  while (Buffer.concat(blocks).length < totalLen) {
    const data = Buffer.concat([lastBlock, Buffer.from(password, 'utf8'), salt]);
    lastBlock = crypto.createHash('md5').update(data).digest();
    blocks.push(lastBlock);
  }

  const derived = Buffer.concat(blocks);
  return {
    key: derived.subarray(0, keyLen),
    iv: derived.subarray(keyLen, keyLen + ivLen),
  };
}

// ---------- Password Hashing (bcrypt) ----------
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
