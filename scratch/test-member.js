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
  
  const member = await db.collection('members').findOne({});
  console.log('Member payload:', member.payload);
  
  await client.close();
}
run().catch(console.error);
