const mongoose = require('mongoose');
const path = require('path');

// Load env from root .env if present
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {}

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error(' No MONGO_URI or MONGODB_URI found in environment. Set it and re-run.');
  process.exit(1);
}

const redacted = uri.replace(/\/\/([^:\/]+):([^@\/]+)@/, '//***:***@');
console.log(` Attempting MongoDB connection to: ${redacted}`);

(async () => {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 1,
      bufferCommands: false,
      connectTimeoutMS: 8000,
    });
    const admin = conn.connection.db.admin();
    const ping = await admin.ping();
    console.log(' Ping ok:', ping);
    console.log(`  Database name: ${conn.connection.name}`);
    console.log(` Connection state: ${conn.connection.readyState}`);
    await mongoose.disconnect();
    console.log(' Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error(' MongoDB connection failed:', err?.message || err);
    if (err && err.reason) console.error(String(err.reason));
    process.exit(2);
  }
})();
