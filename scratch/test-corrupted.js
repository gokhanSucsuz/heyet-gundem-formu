const fs = require('fs');
const { MongoClient } = require('mongodb');
const env = fs.readFileSync('.env', 'utf8');
const envDict = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k) envDict[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function run() {
  const client = new MongoClient(envDict['MONGODB_URI']);
  await client.connect();
  const db = client.db();
  
  const form = await db.collection('forms').findOne({ _id: '2ee71810-c5c4-4e87-8bb5-405c89bdcdd3' });
  console.log('Payload length:', form.payload ? form.payload.length : 0);
  console.log('Payload starts with:', form.payload ? form.payload.substring(0, 50) : 'null');
  
  await client.close();
}
run().catch(console.error);
