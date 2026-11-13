import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ---------- Configuration ----------
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;   // 128-bit auth tag
const KEY_LENGTH = 32;        // 256-bit key
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';

// ---------- Key Derivation ----------
const stripQuotes = (v?: string) => (v ? v.replace(/^["']|["']$/g, '').trim() : undefined);

const B64_KEY = stripQuotes(process.env.ENCRYPTION_KEY_B64);
const RAW_KEY = B64_KEY ? Buffer.from(B64_KEY, 'base64').toString('utf8') : stripQuotes(process.env.ENCRYPTION_KEY);
const RAW_SALT = stripQuotes(process.env.ENCRYPTION_SALT);

const ENCRYPTION_KEY_STR = RAW_KEY || 'build-time-fallback-key-never-use-in-production';
const ENCRYPTION_SALT_STR = RAW_SALT || 'build-time-fallback-salt';

// Comprehensive list of all historical keys used in project versions/branches
const CANDIDATE_KEYS: string[] = Array.from(
  new Set(
    [
      RAW_KEY,
      'edirne-sydv-secret-key-2024',
      'build-time-fallback-key-never-use-in-production',
      'build-time-fallback-never-use-in-prod',
      'sdfjh9879+^%^%FDGFD43543ıou87876.,%((fd74ghdDfdgFTJY+%8778987ÜİkşkaQQqqu8uy74n%&+%&/kjhuıyRt78%rt54/',
      'FDS%+6+^%+^&%+/&%RUFGbvddYTYgfde9878.,.,.,*YH&/y64gr6yuhjkjklsfds%+&__-?09786OOPPLJHN:bnhgvcf9Y%/%/&&978%+&%++^575687998//&+^popoxzaQW^+3asdASzZWQ',
      'FDS%+6+^%+^&%+/&%RUFGYH&/y64gr6yuhjkjklsfds%+&__-?09786OOPPLJHN:bnhgvcf9Y%/%/&&978%+&%++^575687998//&+^popoxzaQW^+3asdASzZWQ',
      'a8fd505fec80f36bb63056264ac254172a00b728ab8a3b9115580278fdf4d346',
      '5ecd841f5a9fe8e49e287d02462d2f832177b252b0c7cc37d13abffc020ec55c',
      'acb6847010f6d2060e9fc8d875300e51d549e8732c4be718123746c231789ad9',
      '1b9e52f8ff23469d410b671e7e20614980da72a3e37c64c06972ca27c838c5a3',
      'your-32-byte-hex-key-here',
      'default-super-secret-key-1234567890',
    ].filter(Boolean) as string[]
  )
);

const CANDIDATE_SALTS: string[] = Array.from(
  new Set(
    [
      RAW_SALT,
      'c4e6f8a0b2d4e6f8a0b2c4e6f8a0b2c4',
      'build-time-fallback-salt',
      'edirne-sydv-salt',
      'your-16-byte-hex-salt-here',
      'edirne-sydv-secret-key-2024',
    ].filter(Boolean) as string[]
  )
);

/** Non-reversible key info for diagnostics. Never exposes the key itself. */
export function getKeyInfo() {
  return {
    source: B64_KEY ? 'ENCRYPTION_KEY_B64' : RAW_KEY ? 'ENCRYPTION_KEY' : 'fallback',
    length: RAW_KEY ? RAW_KEY.length : 0,
    fingerprint: crypto.createHash('sha256').update(ENCRYPTION_KEY_STR, 'utf8').digest('hex').slice(0, 12),
    saltSet: !!RAW_SALT,
    candidatesCount: CANDIDATE_KEYS.length,
  };
}

// Cache derived keys to avoid repeated 100,000-iteration PBKDF2 calls
const derivedKeyCache = new Map<string, Buffer>();

function deriveKey(keyStr: string, saltStr: string): Buffer {
  const cacheKey = `${keyStr}:::${saltStr}`;
  const existing = derivedKeyCache.get(cacheKey);
  if (existing) return existing;

  const salt = Buffer.from(saltStr, 'hex').length >= 16
    ? Buffer.from(saltStr, 'hex')
    : Buffer.from(saltStr, 'utf-8');

  const derived = crypto.pbkdf2Sync(
    keyStr,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
  derivedKeyCache.set(cacheKey, derived);
  return derived;
}

function getDerivedKey(): Buffer {
  return deriveKey(ENCRYPTION_KEY_STR, ENCRYPTION_SALT_STR);
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

// Single key GCM decrypt attempt
function tryGcmDecrypt(ciphertextBuf: Buffer, iv: Buffer, authTag: Buffer, keyStr: string, saltStr: string): any {
  try {
    const key = deriveKey(keyStr, saltStr);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);
    const text = decrypted.toString('utf8');
    if (!text) return null;
    return JSON.parse(text);
  } catch {
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

// Legacy CryptoJS AES Decrypt (OpenSSL format: "Salted__" + salt + ciphertext)
function tryLegacyDecrypt(raw: Buffer, legacyKey: string): any {
  try {
    const header = raw.subarray(0, 8).toString('utf8');
    let key: Buffer, iv: Buffer, ciphertext: Buffer;

    if (header === 'Salted__') {
      const salt = raw.subarray(8, 16);
      ciphertext = raw.subarray(16);
      const derived = evpBytesToKey(legacyKey, salt, 32, 16);
      key = derived.key;
      iv = derived.iv;
    } else {
      const derived = evpBytesToKey(legacyKey, Buffer.alloc(0), 32, 16);
      key = derived.key;
      iv = derived.iv;
      ciphertext = raw;
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const text = decrypted.toString('utf8');
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------- Unified Resilient Decrypt ----------
export function decryptData(encryptedStr: any): any {
  if (encryptedStr === null || encryptedStr === undefined) return null;

  // 1. If already an object (plain unencrypted data)
  if (typeof encryptedStr === 'object') return encryptedStr;

  if (typeof encryptedStr !== 'string') return null;

  // 2. If it's a plain unencrypted JSON string
  const trimmed = encryptedStr.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed) return parsed;
    } catch {}
  }

  try {
    const combined = Buffer.from(encryptedStr, 'base64');

    // 3. If buffer has valid GCM layout (iv + authTag + at least 1 byte ciphertext)
    if (combined.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      // Fast path: try current primary key and salt
      const primaryRes = tryGcmDecrypt(ciphertext, iv, authTag, ENCRYPTION_KEY_STR, ENCRYPTION_SALT_STR);
      if (primaryRes !== null) return primaryRes;

      // Multi-key fallback for GCM
      for (const k of CANDIDATE_KEYS) {
        for (const s of CANDIDATE_SALTS) {
          if (k === ENCRYPTION_KEY_STR && s === ENCRYPTION_SALT_STR) continue; // already tried
          const res = tryGcmDecrypt(ciphertext, iv, authTag, k, s);
          if (res !== null) return res;
        }
      }
    }

    // 4. Legacy CryptoJS format fallback
    // Fast path: try current key
    const primaryLegacyRes = tryLegacyDecrypt(combined, ENCRYPTION_KEY_STR);
    if (primaryLegacyRes !== null) return primaryLegacyRes;

    // Multi-key fallback for Legacy
    for (const k of CANDIDATE_KEYS) {
      if (k === ENCRYPTION_KEY_STR) continue; // already tried
      const res = tryLegacyDecrypt(combined, k);
      if (res !== null) return res;
    }

    return null;
  } catch (error) {
    console.error('[Encryption] Decryption failed for all candidate keys:', error);
    return null;
  }
}

// ---------- Password Hashing (bcrypt) ----------
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
