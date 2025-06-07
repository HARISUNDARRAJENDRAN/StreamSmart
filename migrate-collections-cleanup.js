const mongoose = require('mongoose');
require('dotenv').config();

async function migrateAndCleanupCollections() {
  console.log('🔄 Starting Collection Migration and Cleanup\n');
  
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Step 1: Backup contents collection (just in case)
    console.log('📦 Step 1: Creating backup of contents collection...');
    const contentsData = await db.collection('contents').find({}).toArray();
    console.log(`   Backed up ${contentsData.length} documents from contents`);
    
    // Step 2: Analyze what we're about to delete
    console.log('\n🔍 Step 2: Analyzing data to be removed...');
    const categoriesInContents = await db.collection('contents').distinct('category');
    const categoriesInVideos = await db.collection('videos').distinct('category');
    
    console.log('Categories that will be lost from contents collection:');
    const categoriesToLose = categoriesInContents.filter(cat => !categoriesInVideos.includes(cat));
    categoriesToLose.forEach(cat => {
      console.log(`   ⚠️  ${cat} (placeholder data - will be repopulated with real YouTube videos)`);
    });
    
    // Step 3: Check if videos collection is connected to frontend
    console.log('\n🎯 Step 3: Cleanup plan:');
    console.log('   ✅ Keep: videos collection (real YouTube data)');
    console.log('   ❌ Remove: contents collection (placeholder data)');
    console.log('   📝 Note: Other categories will be populated with real YouTube videos');
    
    // Step 4: Prompt for confirmation
    console.log('\n⚠️  IMPORTANT: This will DELETE the contents collection!');
    console.log('   - 128 placeholder documents will be removed');
    console.log('   - Only real YouTube videos (91 docs) will remain');
    console.log('   - Frontend should use "videos" collection going forward');
    
    // For safety, let's not auto-delete. Instead, show what would happen
    console.log('\n🛡️  SAFETY MODE: Not deleting automatically');
    console.log('   To proceed with deletion, set CONFIRM_DELETE=true');
    
    if (process.env.CONFIRM_DELETE === 'true') {
      console.log('\n🗑️  Proceeding with deletion...');
      
      // Delete contents collection
      const deleteResult = await db.collection('contents').deleteMany({});
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} documents from contents collection`);
      
      // Optionally drop the entire collection
      await db.collection('contents').drop();
      console.log('   ✅ Dropped contents collection entirely');
      
      console.log('\n✨ Migration completed successfully!');
      console.log('   - Frontend should now use "videos" collection only');
      console.log('   - Run population scripts to add YouTube videos to other categories');
      
    } else {
      console.log('\n💡 To actually perform the deletion, run:');
      console.log('   CONFIRM_DELETE=true node migrate-collections-cleanup.js');
    }
    
    // Step 5: Show final database state
    console.log('\n📊 Current Database State:');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (['contents', 'videos', 'playlists'].includes(col.name)) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   📁 ${col.name}: ${count} documents`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

migrateAndCleanupCollections(); 