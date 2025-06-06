const mongoose = require('mongoose');

async function checkUsers() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      email: String,
      name: String
    }));
    
    const users = await User.find({}).limit(10);
    console.log(`\nFound ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id} | Email: ${user.email} | Username: ${user.username || 'N/A'}`);
    });
    
    if (users.length > 0) {
      console.log(`\nUse this user ID for testing: ${users[0]._id}`);
    } else {
      console.log('\nNo users found in database.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUsers(); 