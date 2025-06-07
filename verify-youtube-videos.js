const mongoose = require('mongoose');
require('dotenv').config();

// List of all subcategories we're populating
const allSubcategories = [
  // Skill-Based Genres
  'Coding and Programming',
  'Data Science and AI/ML',
  'Design(UI/UX , graphic, product)',
  'Digital Marketing',
  'Productivity & Time Management',
  'Financial Literacy & Investing',
  'Soft Skills (Communication, Leadership)',
  'Entrepreneurship & Startups',
  'Writing & Content Creation',
  'Public Speaking',

  // Academic Genres
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Language Learning',

  // Career & Professional Development
  'Resume Building & Job Hunting',
  'Interview Preparation',
  'Workplace Skills',

  // Tech News & Trends
  'Tech News & Product Launches',
  'Cybersecurity',
  'Cloud Computing',
  'Artificial Intelligence',

  // Mind-expanding & Curiosity
  'Did You Know / Trivia',
  'Philosophy & Critical Thinking',
  'Psychology & Human Behavior',

  // DIY & Hands-on Learning
  'Robotics & IoT',
  'Electronics & Circuits',
  'Crafts & Artistic Skills',

  // Lifestyle & Wellness
  'Health & Fitness',
  'Cooking & Nutrition',
  'Personal Development & Mental Health'
];

async function setupDatabase() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB');
    
    const videoSchema = new mongoose.Schema({
      youtubeId: String,
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
    
    return mongoose.model('Video', videoSchema);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function verifyYouTubeVideos() {
  console.log('🔍 Verifying YouTube Videos in Database\n');
  
  try {
    const Video = await setupDatabase();
    
    // Get total video count
    const totalVideos = await Video.countDocuments();
    console.log(`📊 Total videos in database: ${totalVideos}\n`);
    
    // Check each subcategory
    console.log('📋 Videos per subcategory:');
    console.log('='.repeat(80));
    
    const results = [];
    let totalCategorizedVideos = 0;
    
    for (const subcategory of allSubcategories) {
      const count = await Video.countDocuments({ category: subcategory });
      const status = count >= 100 ? '✅' : count >= 50 ? '⚠️' : '❌';
      const progressBar = '█'.repeat(Math.floor(count / 5)) + '░'.repeat(20 - Math.floor(count / 5));
      
      console.log(`${status} ${subcategory.padEnd(40)} │ ${count.toString().padStart(3)} │ ${progressBar}`);
      
      results.push({ subcategory, count, status });
      totalCategorizedVideos += count;
    }
    
    console.log('='.repeat(80));
    
    // Summary statistics
    const completedCategories = results.filter(r => r.count >= 100).length;
    const partialCategories = results.filter(r => r.count >= 50 && r.count < 100).length;
    const emptyCategories = results.filter(r => r.count < 50).length;
    
    console.log('\n📊 Summary Statistics:');
    console.log(`   Completed (≥100 videos): ${completedCategories}/${allSubcategories.length}`);
    console.log(`   Partial (50-99 videos):  ${partialCategories}/${allSubcategories.length}`);
    console.log(`   Needs work (<50 videos): ${emptyCategories}/${allSubcategories.length}`);
    console.log(`   Total categorized videos: ${totalCategorizedVideos}`);
    
    // Categories that need attention
    const needsAttention = results.filter(r => r.count < 100);
    if (needsAttention.length > 0) {
      console.log('\n🎯 Categories needing more videos:');
      needsAttention.forEach(({ subcategory, count }) => {
        console.log(`   ${subcategory}: needs ${100 - count} more videos`);
      });
    }
    
    // Get some sample videos
    console.log('\n🎬 Sample videos:');
    const sampleVideos = await Video.find()
      .limit(5)
      .select('title category channelTitle duration viewCount')
      .sort({ createdAt: -1 });
    
    sampleVideos.forEach((video, idx) => {
      console.log(`   ${idx + 1}. ${video.title} (${video.category})`);
      console.log(`      Channel: ${video.channelTitle}, Duration: ${video.duration}, Views: ${video.viewCount?.toLocaleString() || 'N/A'}`);
    });
    
    // Most popular categories
    console.log('\n🏆 Top categories by video count:');
    const topCategories = results
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    topCategories.forEach(({ subcategory, count }, idx) => {
      console.log(`   ${idx + 1}. ${subcategory}: ${count} videos`);
    });
    
    // Check for YouTube-specific data
    const youtubeVideos = await Video.countDocuments({ youtubeId: { $exists: true } });
    const withThumbnails = await Video.countDocuments({ thumbnail: { $exists: true, $ne: '' } });
    const withDuration = await Video.countDocuments({ duration: { $exists: true, $ne: '' } });
    
    console.log('\n🔗 YouTube Integration Quality:');
    console.log(`   Videos with YouTube ID: ${youtubeVideos}/${totalVideos} (${(youtubeVideos/totalVideos*100).toFixed(1)}%)`);
    console.log(`   Videos with thumbnails: ${withThumbnails}/${totalVideos} (${(withThumbnails/totalVideos*100).toFixed(1)}%)`);
    console.log(`   Videos with duration: ${withDuration}/${totalVideos} (${(withDuration/totalVideos*100).toFixed(1)}%)`);
    
    // Recent additions
    const recentVideos = await Video.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    console.log(`   Recently added (24h): ${recentVideos} videos`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Function to get detailed stats for a specific category
async function getDetailedCategoryStats(categoryName) {
  console.log(`🔍 Detailed stats for: ${categoryName}\n`);
  
  try {
    const Video = await setupDatabase();
    
    const videos = await Video.find({ category: categoryName })
      .select('title channelTitle duration viewCount likeCount publishedAt difficulty')
      .sort({ viewCount: -1 });
    
    if (videos.length === 0) {
      console.log('❌ No videos found for this category');
      return;
    }
    
    console.log(`📊 Found ${videos.length} videos\n`);
    
    // Stats
    const avgViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0) / videos.length;
    const totalLikes = videos.reduce((sum, v) => sum + (v.likeCount || 0), 0);
    
    console.log('📈 Statistics:');
    console.log(`   Average views: ${avgViews.toLocaleString()}`);
    console.log(`   Total likes: ${totalLikes.toLocaleString()}`);
    
    // Difficulty distribution
    const difficultyStats = videos.reduce((acc, v) => {
      acc[v.difficulty || 'unknown'] = (acc[v.difficulty || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🎯 Difficulty distribution:');
    Object.entries(difficultyStats).forEach(([difficulty, count]) => {
      console.log(`   ${difficulty}: ${count} videos`);
    });
    
    // Top channels
    const channelStats = videos.reduce((acc, v) => {
      acc[v.channelTitle] = (acc[v.channelTitle] || 0) + 1;
      return acc;
    }, {});
    
    const topChannels = Object.entries(channelStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log('\n🏆 Top channels:');
    topChannels.forEach(([channel, count]) => {
      console.log(`   ${channel}: ${count} videos`);
    });
    
    // Most viewed videos
    console.log('\n👀 Most viewed videos:');
    videos.slice(0, 5).forEach((video, idx) => {
      console.log(`   ${idx + 1}. ${video.title}`);
      console.log(`      Views: ${video.viewCount?.toLocaleString() || 'N/A'}, Duration: ${video.duration}, Channel: ${video.channelTitle}`);
    });
    
  } catch (error) {
    console.error('❌ Error getting category stats:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    verifyYouTubeVideos();
  } else {
    getDetailedCategoryStats(args[0]);
  }
}

module.exports = {
  verifyYouTubeVideos,
  getDetailedCategoryStats,
  allSubcategories
}; 