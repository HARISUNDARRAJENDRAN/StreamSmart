const mongoose = require('mongoose');
require('dotenv').config();

async function quickVideoCheck() {
  console.log('🔍 Quick Video Database Check\n');
  
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get total count
    const total = await db.collection('videos').countDocuments();
    console.log(`📊 Total videos: ${total}\n`);
    
    // Get category breakdown
    console.log('📋 Videos by Category:');
    console.log('='.repeat(60));
    
    const pipeline = [
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];
    
    const categoryStats = await db.collection('videos').aggregate(pipeline).toArray();
    
    for (const stat of categoryStats) {
      const category = stat._id || 'Unknown';
      const count = stat.count;
      console.log(`📁 ${category}: ${count} videos`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Success! You have videos in ${categoryStats.length} categories`);
    
    // Check if we have the key categories we wanted
    const keyCategories = ['Coding and Programming', 'Data Science and AI/ML', 'Design', 'Digital Marketing'];
    console.log('\n🎯 Key Categories Status:');
    for (const key of keyCategories) {
      const found = categoryStats.find(s => s._id === key);
      if (found) {
        console.log(`✅ ${key}: ${found.count} videos`);
      } else {
        console.log(`❌ ${key}: No videos found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

quickVideoCheck(); 