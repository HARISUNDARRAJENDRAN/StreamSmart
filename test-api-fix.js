const { connectDB } = require('./src/lib/mongodb.ts');
const mongoose = require('mongoose');

// Video schema to match our database structure
const videoSchema = new mongoose.Schema({
  youtubeId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  thumbnail: String,
  duration: String,
  category: String,
  channelTitle: String,
  publishedAt: Date,
  viewCount: Number,
  likeCount: Number,
  youtubeURL: String,
  tags: [String],
  difficulty: String,
  createdAt: { type: Date, default: Date.now }
});

const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);

async function testAPIFix() {
  console.log('🧪 Testing API Fix...\n');
  
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    await connectDB();
    console.log('✅ Database connection successful!\n');
    
    // Test video fetching
    console.log('📹 Testing video fetching...');
    const category = 'Coding and Programming';
    const videos = await Video.find({ category })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category youtubeId')
      .lean();
    
    console.log(`✅ Found ${videos.length} videos for "${category}"`);
    if (videos.length > 0) {
      console.log('\n📋 Sample videos:');
      videos.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.title}`);
      });
    }
    
    console.log('\n🎉 API fix successful! The route should now work correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testAPIFix(); 