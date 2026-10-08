// Verifies the ENCRYPTION_KEY_B64 path decrypts real forms, with ENCRYPTION_KEY removed.
process.loadEnvFile('.env');
const plain = process.env.ENCRYPTION_KEY.replace(/^["']|["']$/g, '').trim();
process.env.ENCRYPTION_KEY_B64 = Buffer.from(plain, 'utf8').toString('base64');
delete process.env.ENCRYPTION_KEY;

import { createRequire } from 'module';
const mongoose = createRequire(import.meta.url)('mongoose');

(async () => {
  const { decryptData, getKeyInfo } = await import('../lib/encryption.ts');
  console.log('key info:', getKeyInfo());
  await mongoose.connect(process.env.MONGODB_URI.replace(/^["']|["']$/g, ''));
  const docs = await mongoose.connection.db.collection('forms').find({}).toArray();
  const ok = docs.filter((d) => decryptData(d.payload) !== null).length;
  console.log(`forms decrypted: ${ok}/${docs.length}`);
  await mongoose.disconnect();
})();
