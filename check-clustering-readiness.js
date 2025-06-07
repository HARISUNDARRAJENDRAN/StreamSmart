const mongoose = require('mongoose');
require('dotenv').config();

async function checkClusteringReadiness() {
  console.log('🧪 Checking Clustering Readiness\n');
  
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Check user data
    const userCount = await db.collection('users').countDocuments();
    console.log(`👥 Total users: ${userCount}`);
    
    // Check viewing history
    const viewingHistoryCount = await db.collection('userviewinghistories').countDocuments();
    console.log(`📺 Viewing history records: ${viewingHistoryCount}`);
    
    // Check user engagement data
    const activitiesCount = await db.collection('activities').countDocuments();
    console.log(`🎯 User activities: ${activitiesCount}`);
    
    const feedbackCount = await db.collection('userfeedbacks').countDocuments();
    console.log(`💬 User feedback records: ${feedbackCount}`);
    
    const navigationCount = await db.collection('usernavigationhistories').countDocuments();
    console.log(`🧭 Navigation history: ${navigationCount}`);
    
    const hoverCount = await db.collection('userhoverinteractions').countDocuments();
    console.log(`🖱️  Hover interactions: ${hoverCount}`);
    
    // Check users with sufficient activity
    const usersWithActivity = await db.collection('userviewinghistories').aggregate([
      {
        $group: {
          _id: '$userId',
          viewCount: { $sum: 1 },
          categories: { $addToSet: '$category' },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $match: {
          viewCount: { $gte: 3 } // Users with at least 3 interactions
        }
      }
    ]).toArray();
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Active users (3+ interactions): ${usersWithActivity.length}`);
    console.log(`   Average interactions per active user: ${viewingHistoryCount / Math.max(usersWithActivity.length, 1)}`);
    
    // Sample user activity
    if (usersWithActivity.length > 0) {
      const sampleUser = usersWithActivity[0];
      console.log(`\n📋 Sample active user:`);
      console.log(`   User ID: ${sampleUser._id}`);
      console.log(`   View count: ${sampleUser.viewCount}`);
      console.log(`   Categories: ${sampleUser.categories.length}`);
    }
    
    // Check for clustering viability
    const minUsersForClustering = 20;
    const minInteractionsPerUser = 3;
    const hasEnoughUsers = usersWithActivity.length >= minUsersForClustering;
    const hasEnoughData = viewingHistoryCount >= (minUsersForClustering * minInteractionsPerUser);
    
    console.log(`\n🎯 Clustering Viability:`);
    console.log(`   Minimum users needed: ${minUsersForClustering}`);
    console.log(`   Active users available: ${usersWithActivity.length}`);
    console.log(`   Has enough users: ${hasEnoughUsers ? '✅' : '❌'}`);
    console.log(`   Has enough interaction data: ${hasEnoughData ? '✅' : '❌'}`);
    
    const shouldRunClustering = hasEnoughUsers && hasEnoughData;
    console.log(`\n🚀 Recommendation: ${shouldRunClustering ? '✅ RUN CLUSTERING' : '❌ WAIT FOR MORE DATA'}`);
    
    if (shouldRunClustering) {
      console.log(`\n💡 Clustering Benefits:`);
      console.log(`   - Personalized recommendations for ${usersWithActivity.length} active users`);
      console.log(`   - Segment-aware recommendations across ${11} video categories`);
      console.log(`   - Improved user engagement through targeted content`);
    } else {
      console.log(`\n📈 To improve clustering readiness:`);
      console.log(`   - Need ${minUsersForClustering - usersWithActivity.length} more active users`);
      console.log(`   - Encourage more user interactions with content`);
      console.log(`   - Add user onboarding to capture preferences`);
    }
    
    return {
      shouldRunClustering,
      activeUsers: usersWithActivity.length,
      totalInteractions: viewingHistoryCount
    };
    
  } catch (error) {
    console.error('❌ Error checking clustering readiness:', error);
    return { shouldRunClustering: false, activeUsers: 0, totalInteractions: 0 };
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkClusteringReadiness(); 