const mongoose = require('mongoose');

async function debugClustering() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('🔗 Connected to MongoDB');
    
    // Check users and viewing history
    const User = mongoose.model('User', new mongoose.Schema({
      email: String
    }));
    
    const ViewingHistory = mongoose.model('UserViewingHistory', new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      videoId: String,
      title: String,
      category: String,
      watchTime: Number,
      viewStartTime: Date
    }));
    
    const users = await User.find({}).limit(10);
    console.log(`\n👥 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user._id} (${user.email})`);
    });
    
    const viewingHistory = await ViewingHistory.find({}).limit(10);
    console.log(`\n📊 Found ${viewingHistory.length} viewing history entries:`);
    viewingHistory.forEach(entry => {
      console.log(`  - User: ${entry.userId}, Video: ${entry.videoId}, Category: ${entry.category}`);
    });
    
    // Test data preprocessing for the first user
    if (users.length > 0) {
      const testUserId = users[0]._id.toString();
      console.log(`\n🔬 Testing data preprocessing for user: ${testUserId}`);
      
      try {
        // Import the data preprocessing service
        const { dataPreprocessingService } = require('./src/services/dataPreprocessingService');
        
        console.log('📈 Testing preprocessing for single user...');
        const singleUserData = await dataPreprocessingService.preprocessUserData(testUserId);
        console.log('✅ Single user preprocessing successful:', {
          userId: singleUserData.userId,
          featuresCount: Object.keys(singleUserData.features).length,
          hasNormalizedFeatures: !!singleUserData.normalizedFeatures
        });
        
        console.log('📊 Testing batch preprocessing...');
        const userIds = users.map(u => u._id.toString());
        const batchData = await dataPreprocessingService.preprocessUsersInBatch(userIds, 10);
        console.log('✅ Batch preprocessing successful:', {
          usersProcessed: batchData.length,
          sampleFeatures: batchData[0] ? Object.keys(batchData[0].features).length : 0
        });
        
        if (batchData.length >= 2) {
          console.log('🔧 Testing clustering feature engineering...');
          const { clusteringFeatureService } = require('./src/services/clusteringFeatureService');
          
          const clusteringFeatures = await clusteringFeatureService.engineerClusteringFeatures(batchData);
          console.log('✅ Clustering feature engineering successful:', {
            featuresCount: clusteringFeatures.length,
            featureKeys: clusteringFeatures[0] ? Object.keys(clusteringFeatures[0]).length : 0
          });
          
          console.log('🔗 Testing clustering preparation...');
          const clusteringData = clusteringFeatureService.prepareForClustering(
            clusteringFeatures,
            undefined,
            true
          );
          console.log('✅ Clustering preparation successful:', {
            featuresMatrix: clusteringData.features.length,
            userIds: clusteringData.userIds.length,
            featureNames: clusteringData.featureNames.length
          });
          
          console.log('🎯 Testing agglomerative clustering...');
          const { agglomerativeClusteringService } = require('./src/services/agglomerativeClusteringService');
          
          const clusteringResult = await agglomerativeClusteringService.performClustering(
            clusteringData,
            {
              numClusters: Math.min(3, clusteringData.userIds.length),
              linkageCriteria: 'ward',
              distanceMetric: 'euclidean',
              minClusterSize: 1
            }
          );
          console.log('✅ Clustering successful:', {
            clustersCount: clusteringResult.clusters.length,
            totalUsers: clusteringResult.metadata.totalUsers,
            quality: clusteringResult.metadata.clusteringQuality
          });
          
          console.log('\n📋 Cluster details:');
          clusteringResult.clusters.forEach((cluster, index) => {
            console.log(`  Cluster ${index + 1}: ${cluster.userIds.length} users`);
            console.log(`    User IDs: ${cluster.userIds.slice(0, 3).join(', ')}`);
            console.log(`    User type: ${cluster.characteristics.userType}`);
            console.log(`    Engagement: ${cluster.characteristics.engagementLevel}`);
          });
          
        } else {
          console.log('❌ Not enough processed users for clustering');
        }
        
      } catch (preprocessError) {
        console.error('❌ Preprocessing error:', preprocessError.message);
        console.error('Stack:', preprocessError.stack);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debugClustering(); 