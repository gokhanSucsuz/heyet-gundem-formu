const fs = require('fs');
const crypto = require('crypto');
const env = fs.readFileSync('.env', 'utf8');
const keyLine = env.split('\n').find(l => l.startsWith('ENCRYPTION_KEY='));
const RAW_KEY = keyLine ? keyLine.split('=').slice(1).join('=').trim() : '';
const ENCRYPTION_KEY_STR = RAW_KEY || 'build-time-fallback-key-never-use-in-production';
const ENCRYPTION_SALT_STR = 'build-time-fallback-salt';

function decrypt2(encryptedStr, keyStr) {
  try {
    const combined = Buffer.from(encryptedStr, 'base64');
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
    return 'Error: ' + e.message;
  }
}
const sample = 'UnHIlO+W896cq7/5k2SJR8TMaSpbNfBqeyH5ILYH59YULTO0q13mNO5BaNlKKK7G46SJ4fUz+aCJs/b/dzSa0rXsZzK6TPKVla9Vg4wnLZA5Lm5w1ROoq1T6HHKyf1ieY3wJj3FPRupQUQl48oGDuC0lzDvgqFleS0pN8gH/bsSBOVHvIUbzK6OLY9sVeIRcmUbLzSoqU+Hi8DQ23Kw3vDuU5hZTXRwLs+4/ZEzo07eSAAp7KMcrw4jIXTvv+jYHj4RWnxIi6i8wlZ/WnrzfrTSMAfGpT/FaSp3xn0KF9C6u2PjZG/zIbXg=';

console.log('Decrypted with raw:', decrypt2(sample, ENCRYPTION_KEY_STR));
console.log('Decrypted without quotes:', decrypt2(sample, ENCRYPTION_KEY_STR.replace(/^\"|\"$/g, '')));
