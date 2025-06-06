const fs = require('fs');
const path = require('path');

// Get ngrok URL from command line argument
const ngrokUrl = process.argv[2];

if (!ngrokUrl) {
  console.log('❌ Please provide the ngrok TCP URL');
  console.log('Usage: node update-ngrok-mongo.js tcp://0.tcp.ngrok.io:12345');
  process.exit(1);
}

// Validate URL format
if (!ngrokUrl.startsWith('tcp://') || !ngrokUrl.includes('.tcp.ngrok.io:')) {
  console.log('❌ Invalid ngrok URL format');
  console.log('Expected format: tcp://0.tcp.ngrok.io:12345');
  process.exit(1);
}

// Convert TCP URL to MongoDB URL
const mongoUrl = ngrokUrl.replace('tcp://', 'mongodb://') + '/streamsmart';

// Update .env.local file
const envPath = path.join(__dirname, '.env.local');
let envContent = '';

// Read existing .env.local if it exists
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Update or add MONGODB_NGROK_URI
const lines = envContent.split('\n');
let foundNgrok = false;
let foundMongo = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('MONGODB_NGROK_URI=')) {
    lines[i] = `MONGODB_NGROK_URI=${mongoUrl}`;
    foundNgrok = true;
  } else if (lines[i].startsWith('MONGODB_URI=')) {
    lines[i] = `MONGODB_URI=${mongoUrl}`;
    foundMongo = true;
  }
}

// Add new lines if not found
if (!foundNgrok) {
  lines.push(`MONGODB_NGROK_URI=${mongoUrl}`);
}
if (!foundMongo) {
  lines.push(`MONGODB_URI=${mongoUrl}`);
}

// Write back to file
fs.writeFileSync(envPath, lines.join('\n'));

console.log('✅ Updated MongoDB configuration:');
console.log(`   ngrok TCP URL: ${ngrokUrl}`);
console.log(`   MongoDB URL: ${mongoUrl}`);
console.log(`   Updated: ${envPath}`);
console.log('');
console.log('🔄 Restart your Next.js server for changes to take effect:');
console.log('   npm run dev');
console.log('');
console.log('🧪 Test the connection:');
console.log('   node test-atlas-connection.js'); 