const mongoose = require('mongoose');

const uri = "mongodb://edirnesydv:2120957Ev.@10.22.1.42:27017/gundem?authSource=admin&directConnection=true";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB!");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections in 'gundem' DB:");
    collections.forEach(c => console.log(" - " + c.name));

    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`Collection '${c.name}' has ${count} documents.`);
      if (count > 0) {
        const sample = await db.collection(c.name).findOne();
        console.log(`Sample from '${c.name}':`, JSON.stringify(sample));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
