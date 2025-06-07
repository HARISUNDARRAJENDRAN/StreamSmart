const mongoose = require('mongoose');
require('dotenv').config();

// Note: fetch is available globally in Node.js 18+

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper function to format duration
function formatDuration(isoDuration) {
  if (!isoDuration) return "0:00";
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  let formattedTime = "";
  if (hours > 0) {
    formattedTime += `${hours}:`;
    formattedTime += `${minutes < 10 ? '0' : ''}${minutes}:`;
  } else {
    formattedTime += `${minutes}:`;
  }
  formattedTime += `${seconds < 10 ? '0' : ''}${seconds}`;
  return formattedTime;
}

// Function to search YouTube videos with enhanced filtering
async function searchYouTubeVideos(query, maxResults = 50, additionalFilters = {}) {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YOUTUBE_API_KEY is not set. Please set your YouTube API key in .env file');
    return [];
  }

  try {
    // Build search URL with filters
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults,
      key: YOUTUBE_API_KEY,
      order: 'relevance',
      safeSearch: 'moderate',
      videoDefinition: 'any',
      videoDuration: additionalFilters.duration || 'any', // 'short', 'medium', 'long', 'any'
      videoLicense: 'any',
      ...additionalFilters
    });

    const searchResponse = await fetch(`${YOUTUBE_API_BASE_URL}/search?${searchParams}`);

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('❌ YouTube API error:', searchResponse.status, errorData.error?.message);
      return [];
    }

    const searchData = await searchResponse.json();
    const videoItems = searchData.items || [];
    const videoIds = videoItems.map(item => item.id.videoId).filter(id => id);

    if (videoIds.length === 0) {
      console.warn('⚠️ No videos found for query:', query);
      return [];
    }

    // Fetch detailed information
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsResponse.ok) {
      console.error('❌ Failed to fetch video details');
      return [];
    }

    const detailsData = await detailsResponse.json();
    const detailedItems = detailsData.items || [];

    // Filter out very short videos (less than 2 minutes) and very long ones (more than 4 hours)
    const filteredVideos = detailedItems.filter(item => {
      const duration = item.contentDetails?.duration;
      if (!duration) return false;
      
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return false;
      
      const hours = parseInt(match[1] || "0");
      const minutes = parseInt(match[2] || "0");
      const seconds = parseInt(match[3] || "0");
      
      const totalMinutes = hours * 60 + minutes + seconds / 60;
      
      // Filter: 2 minutes to 4 hours (for educational content)
      return totalMinutes >= 2 && totalMinutes <= 240;
    });

    return filteredVideos.map(item => ({
      youtubeId: item.id,
      title: item.snippet.title,
      description: item.snippet.description.substring(0, 500),
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      duration: formatDuration(item.contentDetails.duration),
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics?.viewCount || 0),
      likeCount: parseInt(item.statistics?.likeCount || 0),
      youtubeURL: `https://www.youtube.com/watch?v=${item.id}`,
      tags: item.snippet.tags || []
    }));

  } catch (error) {
    console.error('❌ Error searching YouTube videos:', error);
    return [];
  }
}

// Enhanced subcategory queries with better search terms
const enhancedSubcategoryQueries = {
  'Coding and Programming': [
    'JavaScript tutorial complete course', 'Python programming full course', 'React JS comprehensive tutorial',
    'Node.js backend development', 'Java programming masterclass', 'C++ programming course',
    'HTML CSS complete tutorial', 'Angular development course', 'Vue.js framework tutorial',
    'TypeScript programming guide', 'Git GitHub version control', 'SQL database tutorial',
    'MongoDB database course', 'Express.js backend tutorial', 'Django Python framework',
    'Laravel PHP development', 'Spring Boot Java', 'Flutter mobile development',
    'React Native mobile apps', 'Docker containerization tutorial', 'Kubernetes orchestration',
    'microservices architecture', 'REST API development', 'GraphQL tutorial complete',
    'data structures algorithms course', 'coding interview preparation', 'web development bootcamp',
    'mobile app development', 'software engineering principles', 'programming fundamentals course'
  ],

  'Data Science and AI/ML': [
    'machine learning complete course', 'data science Python tutorial', 'TensorFlow deep learning',
    'PyTorch neural networks', 'artificial intelligence course', 'data analysis pandas',
    'numpy scientific computing', 'matplotlib data visualization', 'scikit-learn machine learning',
    'computer vision OpenCV', 'natural language processing', 'big data analytics',
    'data mining techniques', 'statistics for data science', 'linear algebra machine learning',
    'calculus for ML', 'reinforcement learning course', 'supervised learning algorithms',
    'unsupervised learning methods', 'data visualization techniques', 'business intelligence',
    'predictive analytics course', 'R programming statistics', 'Jupyter notebook tutorial',
    'Kaggle machine learning', 'feature engineering guide', 'model deployment MLOps',
    'deep learning fundamentals', 'neural network architectures', 'AI ethics and bias'
  ]
};

// MongoDB setup
async function setupDatabase() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB');
    
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
    
    return mongoose.model('Video', videoSchema);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Function to populate a specific subcategory
async function populateSpecificSubcategory(subcategory, targetCount = 100) {
  console.log(`\n🎯 Populating "${subcategory}" with ${targetCount} YouTube videos...`);
  
  try {
    const Video = await setupDatabase();
    
    // Check existing videos
    const existingCount = await Video.countDocuments({ category: subcategory });
    console.log(`📊 Existing videos: ${existingCount}`);
    
    if (existingCount >= targetCount) {
      console.log(`✅ Already have enough videos (${existingCount}/${targetCount})`);
      return existingCount;
    }
    
    const needed = targetCount - existingCount;
    console.log(`🎯 Need to add: ${needed} more videos`);
    
    // Get search queries for this subcategory
    const queries = enhancedSubcategoryQueries[subcategory];
    if (!queries) {
      console.error(`❌ No search queries defined for "${subcategory}"`);
      return existingCount;
    }
    
    const videos = [];
    const videosPerQuery = Math.ceil(needed / queries.length) + 5; // Add buffer for duplicates
    
    for (let i = 0; i < queries.length && videos.length < needed; i++) {
      const query = queries[i];
      console.log(`  🔍 [${i + 1}/${queries.length}] Searching: "${query}"`);
      
      try {
        const searchResults = await searchYouTubeVideos(query, videosPerQuery);
        
        // Filter out duplicates
        const newVideos = searchResults.filter(video => 
          !videos.some(existing => existing.youtubeId === video.youtubeId)
        );
        
        videos.push(...newVideos);
        console.log(`    ✅ Found ${searchResults.length}, added ${newVideos.length} new (total: ${videos.length})`);
        
        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`    ❌ Error with query "${query}":`, error.message);
      }
    }
    
    // Prepare videos for database
    const videosToInsert = videos.slice(0, needed).map(video => ({
      ...video,
      category: subcategory,
      tags: [
        subcategory.toLowerCase().replace(/ /g, '-'),
        ...video.tags.slice(0, 5) // Keep first 5 original tags
      ],
      difficulty: determineDifficulty(video.title, video.description)
    }));
    
    // Insert videos
    console.log(`💾 Inserting ${videosToInsert.length} videos...`);
    let insertedCount = 0;
    
    for (const video of videosToInsert) {
      try {
        await Video.create(video);
        insertedCount++;
      } catch (error) {
        if (error.code === 11000) {
          continue; // Skip duplicates
        }
        console.error(`Error inserting video: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully added ${insertedCount} new videos to "${subcategory}"`);
    return existingCount + insertedCount;
    
  } catch (error) {
    console.error(`❌ Error populating "${subcategory}":`, error);
    return 0;
  }
}

// Helper function to determine difficulty based on title and description
function determineDifficulty(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('beginner') || text.includes('basics') || text.includes('introduction') || 
      text.includes('getting started') || text.includes('fundamentals')) {
    return 'beginner';
  }
  
  if (text.includes('advanced') || text.includes('expert') || text.includes('masterclass') || 
      text.includes('deep dive') || text.includes('professional')) {
    return 'advanced';
  }
  
  return 'intermediate';
}

// Function to populate multiple subcategories
async function populateMultipleSubcategories(subcategories, targetCount = 100) {
  console.log(`🚀 Populating ${subcategories.length} subcategories with ${targetCount} videos each\n`);
  
  const results = {};
  
  for (let i = 0; i < subcategories.length; i++) {
    const subcategory = subcategories[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 [${i + 1}/${subcategories.length}] Processing: ${subcategory}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const finalCount = await populateSpecificSubcategory(subcategory, targetCount);
      results[subcategory] = finalCount;
      
      // Delay between categories
      if (i < subcategories.length - 1) {
        console.log('⏳ Waiting 3 seconds before next category...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to process "${subcategory}":`, error.message);
      results[subcategory] = 0;
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 POPULATION SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  for (const [subcategory, count] of Object.entries(results)) {
    console.log(`${subcategory}: ${count} videos`);
  }
  
  const totalVideos = Object.values(results).reduce((sum, count) => sum + count, 0);
  console.log(`\nTotal videos across all categories: ${totalVideos}`);
  
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

// Priority subcategories (most popular ones first)
const prioritySubcategories = [
  'Coding and Programming',
  'Data Science and AI/ML',
  'Design(UI/UX , graphic, product)',
  'Digital Marketing',
  'Mathematics',
  'Physics',
  'Health & Fitness',
  'Personal Development & Mental Health'
];

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 Populating priority subcategories...');
    populateMultipleSubcategories(prioritySubcategories, 100);
  } else if (args[0] === '--all') {
    console.log('🚀 Populating ALL subcategories...');
    const allSubcategories = Object.keys(enhancedSubcategoryQueries);
    populateMultipleSubcategories(allSubcategories, 100);
  } else {
    console.log(`🚀 Populating specific subcategory: ${args[0]}`);
    populateSpecificSubcategory(args[0], parseInt(args[1]) || 100)
      .then(() => mongoose.disconnect());
  }
}

module.exports = {
  populateSpecificSubcategory,
  populateMultipleSubcategories,
  enhancedSubcategoryQueries
}; 