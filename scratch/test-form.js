const fs = require('fs');
const { MongoClient } = require('mongodb');
const env = fs.readFileSync('.env', 'utf8');
const mongoUriLine = env.split('\n').find(l => l.startsWith('MONGODB_URI='));
const mongoUri = mongoUriLine.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');

async function run() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  const form = await db.collection('forms').findOne({});
  console.log('Form:', form);
  
  await client.close();
}
run().catch(console.error);
