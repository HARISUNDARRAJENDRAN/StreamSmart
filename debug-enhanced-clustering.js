const mongoose = require('mongoose');

async function debugEnhancedClustering() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    console.log('🔗 Connected to MongoDB for Enhanced Clustering Debug');
    
    // Define schemas
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      username: String
    }));
    
    const ViewingHistory = mongoose.model('UserViewingHistory', new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      itemId: String,
      title: String,
      category: String,
      totalViewDuration: Number,
      completionPercentage: Number,
      viewStartTime: Date
    }));

    // Get test user info
    const testUserId = '68432bd8b4a864a199978f66';
    console.log(`\n🔍 Debugging for user: ${testUserId}`);
    
    // Check if user exists
    const user = await User.findById(testUserId);
    if (!user) {
      console.log('❌ User not found in database!');
      return;
    }
    console.log(`✅ User found: ${user.email} (${user.username})`);
    
    // Check user's viewing history
    const userHistory = await ViewingHistory.find({ userId: testUserId });
    console.log(`📊 User viewing history: ${userHistory.length} entries`);
    
    if (userHistory.length > 0) {
      console.log('📋 Sample viewing entries:');
      userHistory.slice(0, 3).forEach((entry, idx) => {
        console.log(`  ${idx + 1}. Item: ${entry.itemId}, Category: ${entry.category}, Duration: ${entry.totalViewDuration}s, Completion: ${entry.completionPercentage}%`);
      });
    }
    
    // Get all users with viewing history for clustering scope
    const usersWithHistory = await ViewingHistory.distinct('userId');
    console.log(`\n📈 Total users with viewing history: ${usersWithHistory.length}`);
    console.log(`🔍 Sample user IDs: ${usersWithHistory.slice(0, 5).map(id => id.toString()).join(', ')}`);
    
    // Check if our test user is in the clustering scope
    const testUserInScope = usersWithHistory.some(id => id.toString() === testUserId);
    console.log(`🎯 Test user in clustering scope: ${testUserInScope ? '✅ Yes' : '❌ No'}`);
    
    // Get users for a small clustering test
    const sampleUsers = usersWithHistory.slice(0, 20); // Take first 20 users
    console.log(`\n🧪 Testing with ${sampleUsers.length} users for clustering`);
    
    try {
      // Import services with correct path
      const { dataPreprocessingService } = require('./src/services/dataPreprocessingService');
      const { clusteringFeatureService } = require('./src/services/clusteringFeatureService');
      const { agglomerativeClusteringService } = require('./src/services/agglomerativeClusteringService');
      
      console.log('📊 Step 1: Data Preprocessing...');
      const userDataList = [];
      
      for (let i = 0; i < Math.min(10, sampleUsers.length); i++) {
        const userId = sampleUsers[i].toString();
        try {
          const userData = await dataPreprocessingService.preprocessUserData(userId);
          userDataList.push(userData);
          console.log(`  ✅ Processed user ${i + 1}/${Math.min(10, sampleUsers.length)}: ${userId}`);
        } catch (error) {
          console.log(`  ❌ Failed to process user ${userId}: ${error.message}`);
        }
      }
      
      console.log(`📈 Successfully preprocessed ${userDataList.length} users`);
      
      if (userDataList.length >= 3) {
        console.log('\n🔧 Step 2: Feature Engineering...');
        const clusteringFeatures = await clusteringFeatureService.engineerClusteringFeatures(userDataList);
        console.log(`✅ Generated clustering features for ${clusteringFeatures.length} users`);
        
        if (clusteringFeatures.length > 0) {
          console.log('📋 Sample feature keys:', Object.keys(clusteringFeatures[0]).slice(0, 10).join(', '));
        }
        
        console.log('\n🎯 Step 3: Preparing Clustering Data...');
        const clusteringData = clusteringFeatureService.prepareForClustering(
          clusteringFeatures,
          undefined,
          true
        );
        
        console.log(`✅ Clustering data prepared:`);
        console.log(`   Features matrix: ${clusteringData.features.length} x ${clusteringData.featureNames.length}`);
        console.log(`   User IDs: ${clusteringData.userIds.length}`);
        console.log(`   Feature names: ${clusteringData.featureNames.slice(0, 5).join(', ')}...`);
        
        // Check if our test user is in the clustering data
        const testUserInClusteringData = clusteringData.userIds.includes(testUserId);
        console.log(`🎯 Test user in clustering data: ${testUserInClusteringData ? '✅ Yes' : '❌ No'}`);
        
        if (!testUserInClusteringData) {
          console.log(`📋 Available user IDs in clustering data: ${clusteringData.userIds.slice(0, 5).join(', ')}`);
        }
        
        console.log('\n🔬 Step 4: Agglomerative Clustering...');
        const numClusters = Math.min(3, Math.max(2, Math.floor(clusteringData.userIds.length / 3)));
        console.log(`   Target clusters: ${numClusters}`);
        
        const clusteringResult = await agglomerativeClusteringService.performClustering(
          clusteringData,
          {
            numClusters,
            linkageCriteria: 'ward',
            distanceMetric: 'euclidean',
            minClusterSize: 1
          }
        );
        
        console.log(`✅ Clustering completed:`);
        console.log(`   Clusters generated: ${clusteringResult.clusters.length}`);
        console.log(`   Total users clustered: ${clusteringResult.metadata.totalUsers}`);
        console.log(`   Clustering quality: ${clusteringResult.metadata.clusteringQuality}`);
        console.log(`   Silhouette score: ${clusteringResult.metadata.silhouetteScore.toFixed(3)}`);
        
        console.log('\n📊 Cluster Analysis:');
        clusteringResult.clusters.forEach((cluster, idx) => {
          console.log(`   Cluster ${idx + 1}:`);
          console.log(`     Size: ${cluster.clusterSize} users`);
          console.log(`     User IDs: ${cluster.userIds.slice(0, 3).join(', ')}...`);
          console.log(`     User Type: ${cluster.characteristics.userType}`);
          console.log(`     Engagement: ${cluster.characteristics.engagementLevel}`);
          
          // Check if our test user is in this cluster
          const hasTestUser = cluster.userIds.some(id => {
            const idStr = typeof id === 'string' ? id : id.toString();
            return idStr === testUserId;
          });
          
          if (hasTestUser) {
            console.log(`     🎯 TEST USER FOUND IN THIS CLUSTER!`);
          }
        });
        
        // Test segment-aware recommendations
        console.log('\n🎯 Step 5: Testing Segment-Aware Recommendations...');
        const { segmentAwareRecommendationService } = require('./src/services/segmentAwareRecommendationService');
        
        const recommendationRequest = {
          userId: testUserId,
          count: 5,
          excludeViewed: false,
          includeExploration: true,
          contextType: 'homepage'
        };
        
        const recommendations = await segmentAwareRecommendationService.getRecommendations(
          recommendationRequest,
          clusteringResult.clusters
        );
        
        console.log(`✅ Generated ${recommendations.length} recommendations`);
        if (recommendations.length > 0) {
          console.log('📋 Sample recommendations:');
          recommendations.slice(0, 3).forEach((rec, idx) => {
            console.log(`   ${idx + 1}. ${rec.title} (Strategy: ${rec.segmentStrategy}, Score: ${rec.score.toFixed(3)})`);
          });
        }
        
      } else {
        console.log('❌ Not enough preprocessed users for clustering');
      }
      
    } catch (serviceError) {
      console.error('❌ Service error:', serviceError.message);
      console.error('Details:', serviceError.stack);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Debug session complete');
    process.exit(0);
  }
}

debugEnhancedClustering(); 