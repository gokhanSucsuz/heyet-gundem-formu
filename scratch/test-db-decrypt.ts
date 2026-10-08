import fs from 'fs';
import mongoose from 'mongoose';
import { decryptData } from '../lib/encryption';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const envDict: Record<string, string> = {};
lines.forEach(l => {
  const [k, ...v] = l.split('=');
  if (k) envDict[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

process.env.ENCRYPTION_KEY = envDict['ENCRYPTION_KEY'];
process.env.MONGODB_URI = envDict['MONGODB_URI'];
process.env.ENCRYPTION_SALT = envDict['ENCRYPTION_SALT'];

mongoose.connect(process.env.MONGODB_URI as string);

const MemberSchema = new mongoose.Schema({
  payload: String,
});
const MemberModel = mongoose.models.members || mongoose.model('members', MemberSchema);

async function run() {
  const doc = await MemberModel.findOne({});
  console.log("Doc payload length:", doc?.payload?.length);
  const decrypted = decryptData(doc?.payload);
  console.log("Decrypted:", decrypted);
  mongoose.disconnect();
}
run().catch(console.error);
