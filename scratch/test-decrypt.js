const fs = require('fs');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const env = fs.readFileSync('.env', 'utf8');
const keyLine = env.split('\n').find(l => l.startsWith('ENCRYPTION_KEY='));
const RAW_KEY = keyLine ? keyLine.split('=').slice(1).join('=').trim() : '';
const ENCRYPTION_KEY_STR = RAW_KEY || 'build-time-fallback-key-never-use-in-production';
const ENCRYPTION_SALT_STR = 'build-time-fallback-salt';

function decrypt2(encryptedStr, keyStr) {
  try {
    const combined = Buffer.from(encryptedStr, 'base64');
    if (combined.length < 12 + 16 + 1) return legacyDecrypt(encryptedStr, keyStr);

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 12 + 16);
    const ciphertext = combined.subarray(12 + 16);

    const salt = Buffer.from(ENCRYPTION_SALT_STR, 'utf-8');
    const key = crypto.pbkdf2Sync(keyStr, salt, 100000, 32, 'sha512');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (e) {
    try {
        return legacyDecrypt(encryptedStr, keyStr);
    } catch(e2) {
        return 'Error: ' + e.message;
    }
  }
}

function evpBytesToKey(password, salt, keyLen, ivLen) {
    const totalLen = keyLen + ivLen;
    const blocks = [];
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

function legacyDecrypt(encryptedStr, LEGACY_KEY) {
  try {
    const raw = Buffer.from(encryptedStr, 'base64');
    const header = raw.subarray(0, 8).toString('utf8');
    let key, iv, ciphertext;
    if (header === 'Salted__') {
      const salt = raw.subarray(8, 16);
      ciphertext = raw.subarray(16);
      const derived = evpBytesToKey(LEGACY_KEY, salt, 32, 16);
      key = derived.key;
      iv = derived.iv;
    } else {
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
    return 'Legacy Error: ' + e.message;
  }
}

const mongoUriLine = env.split('\n').find(l => l.startsWith('MONGODB_URI='));
const mongoUri = mongoUriLine ? mongoUriLine.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '') : '';

async function run() {
  console.log("Connecting to:", mongoUri.split('@')[1] || mongoUri);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  const members = await db.collection('members').find({}).limit(1).toArray();
  if (members.length > 0) {
      console.log("Found member:", members[0]._id);
      console.log("Decrypted without quotes:", decrypt2(members[0].payload, ENCRYPTION_KEY_STR.replace(/^\"|\"$/g, '')));
  }
  
  const forms = await db.collection('forms').find({}).limit(1).toArray();
  if (forms.length > 0) {
      const dec = decrypt2(forms[0].payload, ENCRYPTION_KEY_STR.replace(/^\"|\"$/g, ''));
      console.log('Form Keys:', Object.keys(dec));
      if (dec.items) console.log('Form Items Count:', dec.items.length);
  }

  const settings = await db.collection('settings').find({}).limit(1).toArray();
  if (settings.length > 0) {
      const dec = decrypt2(settings[0].payload, ENCRYPTION_KEY_STR.replace(/^\"|\"$/g, ''));
      console.log('Settings Keys:', Object.keys(dec));
  }
  
  await client.close();
}
run().catch(console.dir);
