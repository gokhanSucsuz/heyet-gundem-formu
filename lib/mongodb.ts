import mongoose from 'mongoose';

let URI = process.env.MONGODB_URI;

if (URI && URI.includes("mongodb-database-didtlqbqgz0lscyqtj7i8ohv")) {
  URI = URI.replace("mongodb-database-didtlqbqgz0lscyqtj7i8ohv", "127.0.0.1");
}

if (!URI) {
  console.warn('MONGODB_URI is missing');
}

const MONGODB_URI = URI || 'mongodb://localhost:27017/build-fallback';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
