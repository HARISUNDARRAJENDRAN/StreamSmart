const mongoose = require('mongoose');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/streamsmart');
    
    // Check users
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    console.log('👥 Total users:', userCount);
    
    // Check content
    const contentCount = await mongoose.connection.db.collection('contents').countDocuments();
    console.log('📚 Total content items:', contentCount);
    
    // Check viewing history
    const viewingCount = await mongoose.connection.db.collection('userviewinghistories').countDocuments();
    console.log('👀 Total viewing entries:', viewingCount);
    
    // Sample user with preferences
    const sampleUser = await mongoose.connection.db.collection('users').findOne({}, {
      projection: { name: 1, persona: 1, preferences: 1, experienceLevel: 1 }
    });
    console.log('\n📋 Sample user:', JSON.stringify(sampleUser, null, 2));
    
    // Categories breakdown
    const categories = await mongoose.connection.db.collection('contents').distinct('category');
    console.log('\n📂 Available categories:', categories.length);
    categories.forEach(cat => console.log('  -', cat));
    
    // Viewing statistics by category
    const viewingStats = await mongoose.connection.db.collection('userviewinghistories').aggregate([
      { $group: { 
        _id: '$category', 
        totalViews: { $sum: 1 },
        avgWatchTime: { $avg: '$totalViewDuration' },
        avgCompletion: { $avg: '$completionPercentage' }
      }},
      { $sort: { totalViews: -1 } }
    ]).toArray();
    
    console.log('\n📺 Top categories by engagement:');
    viewingStats.slice(0, 5).forEach(stat => {
      console.log(`  ${stat._id}: ${stat.totalViews} views, ${Math.round(stat.avgWatchTime/60)}min avg, ${Math.round(stat.avgCompletion)}% completion`);
    });
    
    // User distribution by persona
    const personaStats = await mongoose.connection.db.collection('users').aggregate([
      { $group: { _id: '$persona', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n👤 User distribution by persona:');
    personaStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} users`);
    });

    // Check that each user has at least 3 videos
    const userViewingCounts = await mongoose.connection.db.collection('userviewinghistories').aggregate([
      { $group: { _id: '$userId', viewCount: { $sum: 1 } } },
      { $group: { 
        _id: null, 
        totalUsers: { $sum: 1 },
        minViews: { $min: '$viewCount' },
        maxViews: { $max: '$viewCount' },
        avgViews: { $avg: '$viewCount' },
        usersWithAtLeast3: { $sum: { $cond: [{ $gte: ['$viewCount', 3] }, 1, 0] } }
      }}
    ]).toArray();
    
    if (userViewingCounts.length > 0) {
      const stats = userViewingCounts[0];
      console.log('\n📊 User viewing patterns:');
      console.log(`  Users with viewing history: ${stats.totalUsers}`);
      console.log(`  Min views per user: ${stats.minViews}`);
      console.log(`  Max views per user: ${stats.maxViews}`);
      console.log(`  Avg views per user: ${Math.round(stats.avgViews)}`);
      console.log(`  Users with 3+ videos: ${stats.usersWithAtLeast3} (${Math.round(stats.usersWithAtLeast3/stats.totalUsers*100)}%)`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkData(); 