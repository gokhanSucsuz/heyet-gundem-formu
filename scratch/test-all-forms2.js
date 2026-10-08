const fs = require('fs');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const env = fs.readFileSync('.env', 'utf8');
const envDict = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k) envDict[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const MONGODB_URI = envDict['MONGODB_URI'];
const RAW_KEY = envDict['ENCRYPTION_KEY'];
const LEGACY_KEY = RAW_KEY || 'build-time-fallback-never-use-in-prod';

function evpBytesToKey(password, salt, keyLen, ivLen) {
  const m = [];
  let d = Buffer.alloc(0);
  while (Buffer.concat(m).length < keyLen + ivLen) {
    d = crypto.createHash('md5').update(Buffer.concat([d, Buffer.from(password, 'utf8'), salt])).digest();
    m.push(d);
  }
  const derived = Buffer.concat(m);
  return { key: derived.subarray(0, keyLen), iv: derived.subarray(keyLen, keyLen + ivLen) };
}

function legacyDecrypt(encryptedStr) {
  const raw = Buffer.from(encryptedStr, 'base64');
  const header = raw.subarray(0, 8).toString('utf8');
  if (header === 'Salted__') {
    const salt = raw.subarray(8, 16);
    const ciphertext = raw.subarray(16);
    const { key, iv } = evpBytesToKey(LEGACY_KEY, salt, 32, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const text = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  }
  return null;
}

function decrypt2(encryptedStr, keyStr) {
  try {
    const combined = Buffer.from(encryptedStr, 'base64');
    if (combined.length < 29) return legacyDecrypt(encryptedStr);
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);
    const salt = Buffer.from('build-time-fallback-salt', 'utf8');
    const key = crypto.pbkdf2Sync(keyStr || 'build-time-fallback-key-never-use-in-production', salt, 100000, 32, 'sha512');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const text = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(text);
  } catch (e) {
    return legacyDecrypt(encryptedStr);
  }
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const forms = await db.collection('forms').find({}).toArray();
  console.log(`Checking ${forms.length} forms...`);
  let success = 0;
  let failed = 0;
  for (let f of forms) {
    if (f.payload) {
      try {
        const dec = decrypt2(f.payload, RAW_KEY);
        if (dec) success++;
        else {
          console.log(`Failed to decrypt form ${f._id} (returned null)`);
          failed++;
        }
      } catch (e) {
        console.log(`Failed to decrypt form ${f._id} (error: ${e.message})`);
        failed++;
      }
    }
  }
  console.log(`Success: ${success}, Failed: ${failed}`);
  await client.close();
}
run().catch(console.error);
