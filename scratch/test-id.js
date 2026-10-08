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
  console.log('Form _id:', form ? form._id : null, 'Type:', form ? typeof form._id : 'N/A');
  if (form && typeof form._id === 'object') {
      console.log('Form IsObjectId:', form._id.constructor.name);
  }
  
  const setting = await db.collection('settings').findOne({});
  console.log('Setting _id:', setting ? setting._id : null, 'Type:', setting ? typeof setting._id : 'N/A');
  if (setting && typeof setting._id === 'object') {
      console.log('Setting IsObjectId:', setting._id.constructor.name);
  }
  
  await client.close();
}
run().catch(console.error);
