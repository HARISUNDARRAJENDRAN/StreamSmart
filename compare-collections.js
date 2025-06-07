const mongoose = require('mongoose');
require('dotenv').config();

async function compareCollections() {
  console.log('🔍 Comparing Contents vs Videos Collections\n');
  
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Analyze Contents collection
    console.log('📁 CONTENTS Collection Analysis:');
    console.log('='.repeat(50));
    
    const contentsCount = await db.collection('contents').countDocuments();
    console.log(`Total documents: ${contentsCount}`);
    
    if (contentsCount > 0) {
      const contentSample = await db.collection('contents').findOne();
      console.log('Sample document structure:');
      console.log(Object.keys(contentSample).filter(k => k !== '_id'));
      
      // Get categories
      const contentCategories = await db.collection('contents').distinct('category');
      console.log(`Categories: ${contentCategories.length}`);
      contentCategories.forEach(cat => console.log(`  - ${cat}`));
      
      // Check for YouTube URLs
      const withYouTube = await db.collection('contents').countDocuments({
        $or: [
          { youtubeURL: { $exists: true } },
          { url: { $regex: /youtube|youtu\.be/i } }
        ]
      });
      console.log(`Documents with YouTube URLs: ${withYouTube}`);
    }
    
    console.log('\n📁 VIDEOS Collection Analysis:');
    console.log('='.repeat(50));
    
    const videosCount = await db.collection('videos').countDocuments();
    console.log(`Total documents: ${videosCount}`);
    
    if (videosCount > 0) {
      const videoSample = await db.collection('videos').findOne();
      console.log('Sample document structure:');
      console.log(Object.keys(videoSample).filter(k => k !== '_id'));
      
      // Get categories
      const videoCategories = await db.collection('videos').distinct('category');
      console.log(`Categories: ${videoCategories.length}`);
      videoCategories.forEach(cat => console.log(`  - ${cat}`));
      
      // Check data quality
      const withThumbnails = await db.collection('videos').countDocuments({
        thumbnail: { $exists: true, $ne: '' }
      });
      const withYouTubeId = await db.collection('videos').countDocuments({
        youtubeId: { $exists: true, $ne: '' }
      });
      const withViewCount = await db.collection('videos').countDocuments({
        viewCount: { $exists: true, $gt: 0 }
      });
      
      console.log(`Documents with thumbnails: ${withThumbnails}`);
      console.log(`Documents with YouTube ID: ${withYouTubeId}`);
      console.log(`Documents with view counts: ${withViewCount}`);
    }
    
    // Check for overlapping categories
    console.log('\n🔍 Category Overlap Analysis:');
    console.log('='.repeat(50));
    
    if (contentsCount > 0 && videosCount > 0) {
      const contentCats = await db.collection('contents').distinct('category');
      const videoCats = await db.collection('videos').distinct('category');
      
      const overlap = contentCats.filter(cat => videoCats.includes(cat));
      const onlyInContents = contentCats.filter(cat => !videoCats.includes(cat));
      const onlyInVideos = videoCats.filter(cat => !contentCats.includes(cat));
      
      console.log(`Overlapping categories: ${overlap.length}`);
      overlap.forEach(cat => console.log(`  ✅ ${cat}`));
      
      console.log(`\nOnly in Contents: ${onlyInContents.length}`);
      onlyInContents.forEach(cat => console.log(`  📄 ${cat}`));
      
      console.log(`\nOnly in Videos: ${onlyInVideos.length}`);
      onlyInVideos.forEach(cat => console.log(`  🎬 ${cat}`));
    }
    
    // Recommendation
    console.log('\n💡 Recommendations:');
    console.log('='.repeat(50));
    
    if (videosCount > 0 && contentsCount > 0) {
      console.log('🎯 RECOMMENDED ACTION: Consolidate collections');
      console.log('   1. Videos collection has real YouTube data (better quality)');
      console.log('   2. Contents collection appears to have seed/placeholder data');
      console.log('   3. Merge useful data from contents → videos');
      console.log('   4. Remove contents collection after migration');
      console.log('   5. Update frontend to use videos collection only');
    } else if (videosCount > 0) {
      console.log('✅ Videos collection is your main collection');
      console.log('   Contents collection can likely be removed');
    } else {
      console.log('⚠️  No real YouTube videos found');
      console.log('   Run population scripts first');
    }
    
  } catch (error) {
    console.error('❌ Error comparing collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

compareCollections(); 