const { populateSpecificSubcategory } = require('./populate-specific-subcategories');
require('dotenv').config();

async function testYouTubeAPI() {
  console.log('🧪 Testing YouTube API Integration\n');
  
  // Check if API key is set
  if (!process.env.YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not found in environment variables');
    console.log('📝 Please add your YouTube API key to .env file:');
    console.log('   YOUTUBE_API_KEY=your_api_key_here');
    console.log('\n🔗 Get your API key from: https://console.cloud.google.com/');
    return;
  }
  
  console.log('✅ YouTube API key found');
  console.log(`🔑 API Key: ${process.env.YOUTUBE_API_KEY.substring(0, 10)}...`);
  
  // Test with a small sample - just 10 videos for "Coding and Programming"
  console.log('\n🎯 Testing with "Coding and Programming" category (10 videos)...\n');
  
  try {
    const result = await populateSpecificSubcategory('Coding and Programming', 10);
    
    if (result > 0) {
      console.log('\n🎉 SUCCESS! YouTube API is working correctly');
      console.log(`✅ Added ${result} videos to "Coding and Programming"`);
      console.log('\n📋 You can now run the full population:');
      console.log('   node populate-specific-subcategories.js');
      console.log('   node populate-specific-subcategories.js --all');
    } else {
      console.log('\n⚠️ No videos were added. Check the logs above for issues.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('\n💡 Quota exceeded. Try again tomorrow or request quota increase.');
    } else if (error.message.includes('API key')) {
      console.log('\n💡 API key issue. Check your key and permissions.');
    } else {
      console.log('\n💡 Check your internet connection and MongoDB.');
    }
  }
}

// Run the test
testYouTubeAPI(); 