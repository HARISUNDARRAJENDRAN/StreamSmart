const mongoose = require('mongoose');

async function checkViewingHistory() {
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
    
    // Check UserViewingHistory with correct schema
    const ViewingHistory = mongoose.model('UserViewingHistory', new mongoose.Schema({
      userId: String,
      itemId: String,
      itemType: String,
      title: String,
      category: String,
      viewStartTime: Date,
      viewEndTime: Date,
      totalViewDuration: Number,
      actualDuration: Number,
      completionPercentage: Number
    }));
    
    const viewingHistory = await ViewingHistory.find({}).limit(15);
    console.log(`\nFound ${viewingHistory.length} viewing history entries:`);
    
    if (viewingHistory.length > 0) {
      viewingHistory.forEach((entry, index) => {
        console.log(`${index + 1}. User: ${entry.userId} | Item: ${entry.itemId} | Duration: ${entry.totalViewDuration}s | Completion: ${entry.completionPercentage}%`);
      });
    } else {
      console.log('No viewing history found - this is why clustering fails!');
    }
    
    // Check total count by user
    const userCounts = await ViewingHistory.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 }, totalWatchTime: { $sum: '$totalViewDuration' } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\nViewing history by user:');
    userCounts.forEach(user => {
      console.log(`User ${user._id}: ${user.count} viewing entries, ${Math.round(user.totalWatchTime/3600)}h total`);
    });
    
    // Check if Content collection exists
    const Content = mongoose.model('Content', new mongoose.Schema({
      title: String,
      category: String,
      duration: Number
    }));
    
    const contentCount = await Content.countDocuments();
    console.log(`\nContent items in database: ${contentCount}`);
    
    if (contentCount === 0) {
      console.log('No content found - recommendations need content to recommend!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkViewingHistory(); 