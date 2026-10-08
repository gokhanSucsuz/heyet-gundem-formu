const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const envDict = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k) envDict[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});
process.env.ENCRYPTION_KEY = envDict['ENCRYPTION_KEY'];
process.env.MONGODB_URI = envDict['MONGODB_URI'];
process.env.NEXTAUTH_URL = envDict['NEXTAUTH_URL'];
process.env.NEXTAUTH_SECRET = envDict['NEXTAUTH_SECRET'];

require('ts-node/register');
const { NextRequest } = require('next/server');
const { GET } = require('./app/api/db/[collection]/route.ts');

async function run() {
  console.log("Testing forms...");
  const req = new NextRequest('http://localhost:3000/api/db/forms', { method: 'GET' });
  try {
    const res = await GET(req, { params: Promise.resolve({ collection: 'forms' }) });
    const json = await res.json();
    console.log("Status:", res.status);
    console.log("Is Error:", json.error !== undefined);
    if (json.error) console.log("Error details:", json.error, json.hint);
    else console.log("Returned forms count:", json.length);
  } catch (e) {
    console.error("Test Forms Crashed:", e);
  }
}
run();
