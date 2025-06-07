const mongoose = require('mongoose');
require('dotenv').config();

// Note: fetch is available globally in Node.js 18+

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// All subcategories with their search queries
const subcategories = {
  // Skill-Based Genres
  'Coding and Programming': [
    'JavaScript tutorial', 'Python programming', 'React JS course', 'Node.js tutorial', 
    'Java programming', 'C++ tutorial', 'HTML CSS', 'Angular tutorial', 'Vue.js course',
    'TypeScript tutorial', 'Git GitHub', 'SQL database', 'MongoDB tutorial', 'Express.js',
    'Django Python', 'Laravel PHP', 'Spring Boot', 'Flutter development', 'React Native',
    'Docker tutorial', 'Kubernetes', 'microservices', 'REST API', 'GraphQL tutorial',
    'data structures algorithms', 'coding interview', 'web development', 'mobile development',
    'software engineering', 'programming fundamentals'
  ],

  'Data Science and AI/ML': [
    'machine learning', 'data science Python', 'TensorFlow tutorial', 'PyTorch course',
    'deep learning', 'neural networks', 'artificial intelligence', 'data analysis',
    'pandas tutorial', 'numpy course', 'matplotlib visualization', 'scikit-learn',
    'computer vision', 'natural language processing', 'big data', 'data mining',
    'statistics for data science', 'linear algebra ML', 'calculus machine learning',
    'reinforcement learning', 'supervised learning', 'unsupervised learning',
    'data visualization', 'business intelligence', 'predictive analytics', 'R programming',
    'Jupyter notebook', 'Kaggle competition', 'feature engineering', 'model deployment'
  ],

  'Design(UI/UX , graphic, product)': [
    'UI UX design', 'Figma tutorial', 'Adobe Photoshop', 'Adobe Illustrator',
    'graphic design', 'web design', 'mobile app design', 'user experience',
    'design thinking', 'wireframing', 'prototyping', 'color theory',
    'typography design', 'logo design', 'brand identity', 'design systems',
    'Adobe XD tutorial', 'Sketch design', 'product design', 'interaction design',
    'visual design', 'design principles', 'design tools', 'creative design',
    'digital art', 'illustration tutorial', 'design inspiration', 'design process'
  ],

  'Digital Marketing': [
    'digital marketing', 'SEO tutorial', 'Google Ads', 'Facebook marketing',
    'social media marketing', 'content marketing', 'email marketing', 'affiliate marketing',
    'influencer marketing', 'PPC advertising', 'marketing strategy', 'brand marketing',
    'conversion optimization', 'analytics tutorial', 'marketing automation', 'lead generation',
    'copywriting', 'marketing funnel', 'growth hacking', 'customer acquisition',
    'retargeting ads', 'video marketing', 'podcast marketing', 'LinkedIn marketing',
    'Instagram marketing', 'Twitter marketing', 'TikTok marketing', 'YouTube marketing'
  ],

  'Productivity & Time Management': [
    'time management', 'productivity tips', 'getting things done', 'task management',
    'goal setting', 'habit formation', 'focus techniques', 'work life balance',
    'procrastination cure', 'efficiency tips', 'organization skills', 'planning strategies',
    'priority management', 'workflow optimization', 'stress management', 'mindfulness productivity',
    'productivity apps', 'project management', 'team productivity', 'remote work productivity',
    'deep work', 'time blocking', 'productivity hacks', 'daily routines',
    'morning routine', 'evening routine', 'productivity mindset', 'energy management'
  ],

  'Financial Literacy & Investing': [
    'personal finance', 'investing basics', 'stock market', 'cryptocurrency',
    'retirement planning', 'budgeting tips', 'debt management', 'saving money',
    'real estate investing', 'financial planning', 'investment strategy', 'portfolio management',
    'options trading', 'forex trading', 'mutual funds', 'ETF investing',
    'dividend investing', 'value investing', 'growth investing', 'financial literacy',
    'money management', 'wealth building', 'passive income', 'side hustles',
    'emergency fund', 'credit score', 'insurance planning', 'tax strategies'
  ],

  'Soft Skills (Communication, Leadership)': [
    'communication skills', 'leadership training', 'public speaking', 'presentation skills',
    'emotional intelligence', 'conflict resolution', 'team building', 'negotiation skills',
    'active listening', 'interpersonal skills', 'leadership development', 'management skills',
    'coaching skills', 'mentoring', 'networking skills', 'social skills',
    'body language', 'assertiveness training', 'feedback skills', 'influence techniques',
    'persuasion skills', 'charisma development', 'confidence building', 'decision making',
    'problem solving', 'critical thinking', 'creativity skills', 'collaboration skills'
  ],

  'Entrepreneurship & Startups': [
    'entrepreneurship', 'startup business', 'business plan', 'venture capital',
    'fundraising startup', 'business model', 'lean startup', 'startup strategy',
    'small business', 'business development', 'innovation', 'startup marketing',
    'product development', 'customer validation', 'market research', 'business growth',
    'scaling business', 'startup funding', 'angel investing', 'bootstrapping',
    'business strategy', 'competitive analysis', 'startup pitch', 'business networking',
    'startup culture', 'business leadership', 'startup management', 'exit strategies'
  ],

  'Writing & Content Creation': [
    'content writing', 'copywriting', 'creative writing', 'technical writing',
    'blog writing', 'article writing', 'storytelling', 'content strategy',
    'SEO writing', 'email writing', 'social media content', 'video scripting',
    'editing writing', 'grammar tips', 'writing techniques', 'content marketing writing',
    'freelance writing', 'writing productivity', 'writing tools', 'content creation',
    'YouTube content creation', 'podcast content', 'newsletter writing', 'writing skills',
    'writing business', 'content planning', 'writing process', 'content optimization'
  ],

  'Public Speaking': [
    'public speaking', 'presentation skills', 'speech techniques', 'overcoming stage fright',
    'confidence speaking', 'voice training', 'body language speaking', 'persuasive speaking',
    'storytelling speaking', 'impromptu speaking', 'TED talk preparation', 'keynote speaking',
    'business presentations', 'pitch presentation', 'speaking anxiety', 'audience engagement',
    'speech writing', 'delivery techniques', 'speaking practice', 'communication skills',
    'presentation design', 'visual aids speaking', 'virtual presentations', 'speaking skills'
  ],

  // Academic Genres
  'Mathematics': [
    'algebra tutorial', 'calculus course', 'geometry lessons', 'trigonometry',
    'statistics math', 'probability theory', 'linear algebra', 'differential equations',
    'discrete mathematics', 'number theory', 'mathematical analysis', 'topology',
    'graph theory', 'combinatorics', 'mathematical logic', 'set theory',
    'abstract algebra', 'real analysis', 'complex analysis', 'numerical methods',
    'mathematical modeling', 'applied mathematics', 'pure mathematics', 'mathematics proofs',
    'mathematical problem solving', 'math competition', 'math olympiad', 'math visualization'
  ],

  'Physics': [
    'physics basics', 'classical mechanics', 'quantum physics', 'thermodynamics',
    'electromagnetism', 'relativity theory', 'astrophysics', 'particle physics',
    'atomic physics', 'nuclear physics', 'condensed matter physics', 'optics physics',
    'waves physics', 'fluid mechanics', 'statistical mechanics', 'solid state physics',
    'plasma physics', 'cosmology', 'physics experiments', 'physics problems',
    'theoretical physics', 'applied physics', 'physics concepts', 'physics visualization',
    'physics demonstrations', 'modern physics', 'physics laboratory', 'physics education'
  ],

  'Chemistry': [
    'chemistry basics', 'organic chemistry', 'inorganic chemistry', 'physical chemistry',
    'analytical chemistry', 'biochemistry', 'chemical reactions', 'periodic table',
    'chemical bonding', 'stoichiometry', 'thermochemistry', 'kinetics chemistry',
    'equilibrium chemistry', 'acids bases', 'electrochemistry', 'polymer chemistry',
    'environmental chemistry', 'medicinal chemistry', 'chemistry lab', 'chemistry experiments',
    'molecular chemistry', 'atomic structure', 'chemical properties', 'chemistry problems',
    'chemistry visualization', 'green chemistry', 'industrial chemistry', 'chemistry education'
  ],

  'Biology': [
    'biology basics', 'cell biology', 'molecular biology', 'genetics',
    'evolution biology', 'ecology', 'anatomy physiology', 'microbiology',
    'biochemistry', 'biotechnology', 'neurobiology', 'marine biology',
    'botany', 'zoology', 'developmental biology', 'immunology',
    'virology', 'bacteriology', 'parasitology', 'conservation biology',
    'systems biology', 'bioinformatics', 'computational biology', 'synthetic biology',
    'biology experiments', 'biology lab', 'biology visualization', 'biology education'
  ],

  'History': [
    'world history', 'ancient history', 'medieval history', 'modern history',
    'European history', 'American history', 'Asian history', 'African history',
    'military history', 'political history', 'social history', 'cultural history',
    'economic history', 'art history', 'history documentaries', 'historical events',
    'historical figures', 'civilization history', 'empire history', 'revolution history',
    'war history', 'cold war', 'renaissance history', 'industrial revolution',
    'history education', 'historical analysis', 'history timeline', 'archaeology'
  ],

  'Geography': [
    'geography basics', 'physical geography', 'human geography', 'world geography',
    'climate geography', 'economic geography', 'urban geography', 'population geography',
    'cultural geography', 'political geography', 'environmental geography', 'regional geography',
    'GIS mapping', 'cartography', 'geology', 'meteorology',
    'oceanography', 'soil science', 'landscape geography', 'tourism geography',
    'geography education', 'geography visualization', 'world countries', 'continents geography',
    'geographical features', 'natural disasters', 'climate change geography', 'sustainable geography'
  ],

  'Language Learning': [
    'English learning', 'Spanish lessons', 'French tutorial', 'German language',
    'Chinese Mandarin', 'Japanese language', 'Italian lessons', 'Portuguese learning',
    'Korean language', 'Arabic learning', 'Russian language', 'Hindi lessons',
    'language grammar', 'vocabulary building', 'pronunciation practice', 'conversation practice',
    'language exchange', 'polyglot tips', 'language learning methods', 'language apps',
    'IELTS preparation', 'TOEFL preparation', 'language fluency', 'language immersion',
    'accent reduction', 'business language', 'travel language', 'language culture'
  ],

  // Career & Professional Development
  'Resume Building & Job Hunting': [
    'resume writing', 'CV creation', 'job search', 'job hunting tips',
    'LinkedIn optimization', 'cover letter writing', 'job application', 'career change',
    'networking career', 'salary negotiation', 'job interview', 'career planning',
    'professional branding', 'career advancement', 'job market trends', 'remote job search',
    'freelance career', 'career coaching', 'professional development', 'career skills',
    'job search strategy', 'career transition', 'employment tips', 'career success',
    'workplace skills', 'professional growth', 'career guidance', 'job opportunities'
  ],

  'Interview Preparation': [
    'job interview tips', 'interview questions', 'interview preparation', 'behavioral interview',
    'technical interview', 'phone interview', 'video interview', 'panel interview',
    'group interview', 'case interview', 'competency interview', 'stress interview',
    'interview skills', 'interview confidence', 'interview practice', 'interview anxiety',
    'interview follow up', 'interview mistakes', 'interview success', 'interview coaching',
    'STAR method interview', 'interview storytelling', 'interview research', 'interview etiquette',
    'virtual interview', 'remote interview', 'interview presentation', 'interview negotiation'
  ],

  'Workplace Skills': [
    'workplace communication', 'professional etiquette', 'office politics', 'team collaboration',
    'workplace productivity', 'time management work', 'project management', 'meeting skills',
    'email etiquette', 'workplace relationships', 'conflict resolution work', 'workplace diversity',
    'remote work skills', 'virtual team management', 'workplace technology', 'professional development',
    'career advancement', 'leadership workplace', 'mentoring workplace', 'workplace culture',
    'work life balance', 'stress management work', 'workplace wellness', 'professional skills',
    'workplace innovation', 'change management', 'workplace learning', 'professional communication'
  ],

  // Tech News & Trends
  'Tech News & Product Launches': [
    'tech news', 'technology trends', 'product launches tech', 'smartphone reviews',
    'laptop reviews', 'gadget reviews', 'tech announcements', 'Apple news',
    'Google tech', 'Microsoft updates', 'Samsung products', 'tech industry',
    'innovation tech', 'emerging technology', 'tech startups', 'tech conferences',
    'CES coverage', 'tech analysis', 'future technology', 'disruptive technology',
    'technology adoption', 'tech market trends', 'digital transformation', 'tech ecosystem',
    'tech investment', 'technology research', 'tech predictions', 'technology impact'
  ],

  'Cybersecurity': [
    'cybersecurity basics', 'network security', 'ethical hacking', 'penetration testing',
    'information security', 'cyber threats', 'malware analysis', 'incident response',
    'security awareness', 'password security', 'encryption', 'firewall configuration',
    'vulnerability assessment', 'security auditing', 'cyber forensics', 'security compliance',
    'data protection', 'privacy security', 'cloud security', 'mobile security',
    'IoT security', 'web application security', 'social engineering', 'security training',
    'cybersecurity career', 'security certifications', 'security tools', 'threat intelligence'
  ],

  'Cloud Computing': [
    'cloud computing basics', 'AWS tutorial', 'Azure cloud', 'Google Cloud Platform',
    'cloud migration', 'cloud architecture', 'cloud security', 'cloud storage',
    'serverless computing', 'container orchestration', 'cloud deployment', 'cloud monitoring',
    'hybrid cloud', 'multi cloud', 'cloud cost optimization', 'cloud networking',
    'cloud databases', 'cloud automation', 'DevOps cloud', 'cloud native',
    'cloud scalability', 'cloud backup', 'disaster recovery cloud', 'cloud governance',
    'cloud strategy', 'cloud transformation', 'cloud services', 'cloud infrastructure'
  ],

  'Artificial Intelligence': [
    'artificial intelligence', 'AI basics', 'machine learning AI', 'deep learning AI',
    'neural networks AI', 'AI applications', 'AI ethics', 'AI future',
    'computer vision AI', 'natural language processing AI', 'robotics AI', 'AI automation',
    'AI business', 'AI strategy', 'AI implementation', 'AI tools',
    'conversational AI', 'AI chatbots', 'AI algorithms', 'AI research',
    'AI innovation', 'AI startups', 'AI investment', 'AI career',
    'AI education', 'AI development', 'AI platforms', 'AI trends'
  ],

  // Mind-expanding & Curiosity
  'Did You Know / Trivia': [
    'amazing facts', 'interesting trivia', 'science facts', 'history facts',
    'nature facts', 'space facts', 'animal facts', 'weird facts',
    'fun facts', 'mind blowing facts', 'educational facts', 'curious facts',
    'trivia questions', 'general knowledge', 'fact compilation', 'did you know',
    'fascinating facts', 'unusual facts', 'surprising facts', 'incredible facts',
    'facts about world', 'facts about humans', 'facts about animals', 'facts about universe',
    'mythology facts', 'cultural facts', 'technology facts', 'facts documentary'
  ],

  'Philosophy & Critical Thinking': [
    'philosophy basics', 'critical thinking', 'logic philosophy', 'ethics philosophy',
    'ancient philosophy', 'modern philosophy', 'political philosophy', 'moral philosophy',
    'philosophy of mind', 'philosophy of science', 'existentialism', 'stoicism',
    'philosophical arguments', 'philosophical debates', 'reasoning skills', 'logical fallacies',
    'decision making philosophy', 'problem solving philosophy', 'philosophical thinking',
    'philosophy education', 'famous philosophers', 'philosophical concepts', 'philosophy discussion',
    'applied philosophy', 'practical philosophy', 'philosophy life', 'wisdom philosophy'
  ],

  'Psychology & Human Behavior': [
    'psychology basics', 'cognitive psychology', 'behavioral psychology', 'social psychology',
    'developmental psychology', 'personality psychology', 'abnormal psychology', 'positive psychology',
    'neuropsychology', 'clinical psychology', 'educational psychology', 'sports psychology',
    'human behavior', 'psychological experiments', 'psychology research', 'psychology theories',
    'mental health psychology', 'psychology applications', 'psychology education', 'psychology career',
    'psychological disorders', 'therapy psychology', 'counseling psychology', 'psychology techniques',
    'psychological assessment', 'psychology statistics', 'psychology ethics', 'psychology trends'
  ],

  // DIY & Hands-on Learning
  'Robotics & IoT': [
    'robotics basics', 'Arduino projects', 'Raspberry Pi tutorial', 'IoT projects',
    'robot building', 'sensors robotics', 'actuators robotics', 'robotics programming',
    'autonomous robots', 'drone building', 'robot control', 'robotics AI',
    'industrial robotics', 'educational robotics', 'hobby robotics', 'robotics competition',
    'smart home IoT', 'IoT sensors', 'IoT connectivity', 'IoT platforms',
    'IoT security', 'IoT applications', 'embedded systems', 'microcontrollers',
    'IoT development', 'robotics engineering', 'automation projects', 'mechatronics'
  ],

  'Electronics & Circuits': [
    'electronics basics', 'circuit design', 'electronic components', 'breadboard tutorial',
    'soldering tutorial', 'PCB design', 'electronic projects', 'digital electronics',
    'analog electronics', 'microelectronics', 'power electronics', 'electronic testing',
    'oscilloscope tutorial', 'multimeter usage', 'electronic troubleshooting', 'electronic repair',
    'electronic prototyping', 'electronic simulation', 'electronic theory', 'electronic circuits',
    'electronic devices', 'electronic systems', 'electronic engineering', 'electronic hobby',
    'electronic kits', 'electronic tools', 'electronic safety', 'electronic innovation'
  ],

  'Crafts & Artistic Skills': [
    'DIY crafts', 'handmade crafts', 'art techniques', 'drawing tutorial',
    'painting techniques', 'sculpture tutorial', 'pottery making', 'jewelry making',
    'woodworking projects', 'sewing tutorial', 'knitting patterns', 'crochet tutorial',
    'origami tutorial', 'paper crafts', 'fabric crafts', 'home decor DIY',
    'craft projects', 'artistic skills', 'creative projects', 'craft techniques',
    'art supplies', 'craft tools', 'artistic expression', 'craft inspiration',
    'handmade gifts', 'craft business', 'art education', 'creative skills'
  ],

  // Lifestyle & Wellness
  'Health & Fitness': [
    'fitness workout', 'exercise routine', 'strength training', 'cardio workout',
    'yoga practice', 'pilates workout', 'bodyweight exercises', 'weight loss',
    'muscle building', 'fitness nutrition', 'healthy lifestyle', 'workout plan',
    'home workout', 'gym workout', 'running training', 'cycling fitness',
    'flexibility training', 'mobility exercises', 'injury prevention', 'recovery fitness',
    'fitness motivation', 'fitness tips', 'fitness beginner', 'fitness advanced',
    'sports training', 'athletic performance', 'fitness health', 'wellness fitness'
  ],

  'Cooking & Nutrition': [
    'cooking tutorial', 'healthy recipes', 'nutrition basics', 'meal prep',
    'cooking techniques', 'baking tutorial', 'vegetarian recipes', 'vegan cooking',
    'international cuisine', 'cooking tips', 'kitchen skills', 'food preparation',
    'dietary nutrition', 'nutritional science', 'cooking methods', 'food safety',
    'recipe development', 'cooking beginner', 'advanced cooking', 'cooking equipment',
    'food culture', 'sustainable cooking', 'cooking education', 'culinary arts',
    'cooking creativity', 'food presentation', 'cooking science', 'nutrition education'
  ],

  'Personal Development & Mental Health': [
    'personal development', 'self improvement', 'mental health awareness', 'mindfulness meditation',
    'stress management', 'anxiety relief', 'depression help', 'emotional wellness',
    'self care', 'mental health tips', 'psychology wellbeing', 'therapy techniques',
    'personal growth', 'confidence building', 'motivation personal', 'goal achievement',
    'habit formation', 'positive thinking', 'resilience building', 'self awareness',
    'emotional intelligence', 'mental health education', 'wellness practices', 'life coaching',
    'personal transformation', 'mindset change', 'mental health support', 'wellbeing strategies'
  ]
};

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

// Function to search YouTube videos
async function searchYouTubeVideos(query, maxResults = 50) {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY is not set. Cannot search videos.');
    return [];
  }

  try {
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}&order=relevance&safeSearch=moderate&videoDefinition=any&videoDuration=any`
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('YouTube API error:', searchResponse.status, errorData.error?.message);
      return [];
    }

    const searchData = await searchResponse.json();
    const videoItems = searchData.items || [];
    const videoIds = videoItems.map(item => item.id.videoId).filter(id => id);

    if (videoIds.length === 0) {
      return [];
    }

    // Fetch detailed information including duration
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsResponse.ok) {
      console.error('Failed to fetch video details');
      return [];
    }

    const detailsData = await detailsResponse.json();
    const detailedItems = detailsData.items || [];

    return detailedItems.map(item => ({
      youtubeId: item.id,
      title: item.snippet.title,
      description: item.snippet.description.substring(0, 500),
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      duration: formatDuration(item.contentDetails.duration),
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics?.viewCount || 0),
      likeCount: parseInt(item.statistics?.likeCount || 0),
      youtubeURL: `https://www.youtube.com/watch?v=${item.id}`
    }));

  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    return [];
  }
}

// Function to populate videos for a specific subcategory
async function populateSubcategory(subcategory, searchQueries) {
  console.log(`\n🎯 Populating "${subcategory}" with YouTube videos...`);
  
  const videos = [];
  const maxVideosPerQuery = 15; // To get variety across different search terms
  const targetVideos = 100;
  
  for (const query of searchQueries) {
    if (videos.length >= targetVideos) break;
    
    console.log(`  🔍 Searching for: "${query}"`);
    
    try {
      const searchResults = await searchYouTubeVideos(query, maxVideosPerQuery);
      
      // Filter out duplicates and add to collection
      const newVideos = searchResults.filter(video => 
        !videos.some(existing => existing.youtubeId === video.youtubeId)
      );
      
      videos.push(...newVideos);
      console.log(`    ✅ Found ${searchResults.length} videos, added ${newVideos.length} new ones`);
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`    ❌ Error searching for "${query}":`, error.message);
    }
  }
  
  console.log(`📊 Total videos collected for "${subcategory}": ${videos.length}`);
  return videos;
}

// MongoDB setup
async function setupDatabase() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    await mongoose.connect(connectionString);
    console.log('🔗 Connected to MongoDB');
    
    // Define video schema
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

// Main function to populate all subcategories
async function populateAllSubcategories() {
  console.log('🚀 Starting YouTube Video Population for All Subcategories\n');
  
  try {
    const Video = await setupDatabase();
    
    let totalVideosAdded = 0;
    let processedCategories = 0;
    
    for (const [subcategory, searchQueries] of Object.entries(subcategories)) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📂 Processing: ${subcategory} (${processedCategories + 1}/${Object.keys(subcategories).length})`);
        console.log(`${'='.repeat(60)}`);
        
        // Check if we already have videos for this category
        const existingCount = await Video.countDocuments({ category: subcategory });
        console.log(`📊 Existing videos in "${subcategory}": ${existingCount}`);
        
        if (existingCount >= 100) {
          console.log(`✅ "${subcategory}" already has enough videos, skipping...`);
          processedCategories++;
          continue;
        }
        
        // Fetch videos from YouTube
        const videos = await populateSubcategory(subcategory, searchQueries);
        
        if (videos.length === 0) {
          console.log(`⚠️ No videos found for "${subcategory}"`);
          processedCategories++;
          continue;
        }
        
        // Prepare videos for database insertion
        const videosToInsert = videos.map(video => ({
          ...video,
          category: subcategory,
          tags: [subcategory.toLowerCase().replace(/ /g, '-')],
          difficulty: 'intermediate' // Default difficulty
        }));
        
        // Insert videos into database
        console.log(`💾 Inserting ${videosToInsert.length} videos into database...`);
        
        let insertedCount = 0;
        for (const video of videosToInsert) {
          try {
            await Video.create(video);
            insertedCount++;
          } catch (error) {
            if (error.code === 11000) {
              // Duplicate key error, skip
              continue;
            }
            console.error(`Error inserting video: ${error.message}`);
          }
        }
        
        totalVideosAdded += insertedCount;
        console.log(`✅ Successfully inserted ${insertedCount} videos for "${subcategory}"`);
        
        processedCategories++;
        
        // Add delay between categories to respect rate limits
        if (processedCategories < Object.keys(subcategories).length) {
          console.log('⏳ Waiting 2 seconds before next category...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${subcategory}":`, error.message);
        processedCategories++;
        continue;
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 POPULATION COMPLETE!');
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Summary:`);
    console.log(`   Total categories processed: ${processedCategories}`);
    console.log(`   Total videos added: ${totalVideosAdded}`);
    console.log(`   Average videos per category: ${(totalVideosAdded / processedCategories).toFixed(1)}`);
    
    // Get final counts per category
    console.log(`\n📈 Final video counts per category:`);
    for (const subcategory of Object.keys(subcategories)) {
      const count = await Video.countDocuments({ category: subcategory });
      console.log(`   ${subcategory}: ${count} videos`);
    }
    
  } catch (error) {
    console.error('❌ Population failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the population script
if (require.main === module) {
  populateAllSubcategories();
}

module.exports = {
  populateAllSubcategories,
  populateSubcategory,
  subcategories
}; 