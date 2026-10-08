const fs = require('fs');
const { MongoClient } = require('mongodb');
const env = fs.readFileSync('.env', 'utf8');
const mongoUriLine = env.split('\n').find(l => l.startsWith('MONGODB_URI='));
const mongoUri = mongoUriLine.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');

async function run() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  const formsCount = await db.collection('forms').countDocuments();
  console.log('Forms count:', formsCount);
  
  const settingsCount = await db.collection('settings').countDocuments();
  console.log('Settings count:', settingsCount);

  // estimate size
  let totalFormsSize = 0;
  const forms = await db.collection('forms').find({}).toArray();
  for (let f of forms) totalFormsSize += f.payload ? f.payload.length : 0;
  console.log('Total forms payload size:', totalFormsSize);
  
  await client.close();
}
run().catch(console.error);
