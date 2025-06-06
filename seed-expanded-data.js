const mongoose = require('mongoose');

// Comprehensive content categories with realistic videos
const contentByCategory = {
  // Skill-Based Genres (Original)
  'Coding and Programming': [
    { title: 'JavaScript Fundamentals for Beginners', duration: 2400, tags: ['javascript', 'programming', 'web-development'], difficulty: 'beginner' },
    { title: 'React Complete Course 2024', duration: 14400, tags: ['react', 'frontend', 'javascript'], difficulty: 'intermediate' },
    { title: 'Python for Data Analysis', duration: 3600, tags: ['python', 'data', 'programming'], difficulty: 'intermediate' },
    { title: 'Advanced Node.js Backend Development', duration: 5400, tags: ['nodejs', 'backend', 'javascript'], difficulty: 'advanced' },
    { title: 'TypeScript Best Practices', duration: 1800, tags: ['typescript', 'javascript', 'programming'], difficulty: 'intermediate' },
    { title: 'Full Stack Web Development Bootcamp', duration: 21600, tags: ['fullstack', 'web', 'development'], difficulty: 'beginner' },
    { title: 'Docker and Kubernetes for Developers', duration: 4800, tags: ['docker', 'kubernetes', 'devops'], difficulty: 'advanced' },
    { title: 'REST API Design Patterns', duration: 2700, tags: ['api', 'backend', 'design-patterns'], difficulty: 'intermediate' }
  ],
  
  'Data Science and AI/ML': [
    { title: 'Introduction to Machine Learning', duration: 4200, tags: ['machine-learning', 'ai', 'data-science'], difficulty: 'beginner' },
    { title: 'Deep Learning with TensorFlow', duration: 7200, tags: ['deep-learning', 'tensorflow', 'neural-networks'], difficulty: 'advanced' },
    { title: 'Data Visualization with Python', duration: 2700, tags: ['visualization', 'python', 'matplotlib'], difficulty: 'intermediate' },
    { title: 'Natural Language Processing Fundamentals', duration: 5400, tags: ['nlp', 'ai', 'text-analysis'], difficulty: 'intermediate' },
    { title: 'Statistical Analysis for Data Scientists', duration: 3600, tags: ['statistics', 'data-analysis', 'math'], difficulty: 'intermediate' },
    { title: 'Computer Vision with OpenCV', duration: 4800, tags: ['computer-vision', 'opencv', 'image-processing'], difficulty: 'advanced' },
    { title: 'Time Series Analysis and Forecasting', duration: 3300, tags: ['time-series', 'forecasting', 'analysis'], difficulty: 'intermediate' },
    { title: 'MLOps: Machine Learning in Production', duration: 4500, tags: ['mlops', 'production', 'deployment'], difficulty: 'advanced' }
  ],
  
  'Design(UI/UX , graphic, product)': [
    { title: 'UI/UX Design Fundamentals', duration: 3600, tags: ['ui-design', 'ux-design', 'user-experience'], difficulty: 'beginner' },
    { title: 'Advanced Figma Techniques', duration: 2700, tags: ['figma', 'design-tools', 'prototyping'], difficulty: 'intermediate' },
    { title: 'User Research and Testing Methods', duration: 3300, tags: ['user-research', 'testing', 'validation'], difficulty: 'intermediate' },
    { title: 'Design Systems and Component Libraries', duration: 4200, tags: ['design-systems', 'components', 'consistency'], difficulty: 'advanced' },
    { title: 'Adobe Creative Suite Mastery', duration: 5400, tags: ['adobe', 'photoshop', 'illustrator'], difficulty: 'intermediate' },
    { title: 'Mobile App Design Best Practices', duration: 2400, tags: ['mobile-design', 'app-design', 'responsive'], difficulty: 'intermediate' },
    { title: 'Color Theory and Typography', duration: 1800, tags: ['color-theory', 'typography', 'visual-design'], difficulty: 'beginner' },
    { title: 'Brand Identity and Logo Design', duration: 3000, tags: ['branding', 'logo-design', 'identity'], difficulty: 'intermediate' }
  ],
  
  'Digital Marketing': [
    { title: 'Digital Marketing Strategy 2024', duration: 4200, tags: ['digital-marketing', 'strategy', 'online-marketing'], difficulty: 'beginner' },
    { title: 'Google Ads Mastery Course', duration: 5400, tags: ['google-ads', 'ppc', 'advertising'], difficulty: 'intermediate' },
    { title: 'Social Media Marketing Fundamentals', duration: 3000, tags: ['social-media', 'marketing', 'content'], difficulty: 'beginner' },
    { title: 'SEO and Content Marketing', duration: 3600, tags: ['seo', 'content-marketing', 'organic-growth'], difficulty: 'intermediate' },
    { title: 'Email Marketing Automation', duration: 2700, tags: ['email-marketing', 'automation', 'nurturing'], difficulty: 'intermediate' },
    { title: 'Conversion Rate Optimization', duration: 3300, tags: ['cro', 'optimization', 'conversion'], difficulty: 'advanced' },
    { title: 'Influencer Marketing Strategies', duration: 2400, tags: ['influencer-marketing', 'partnerships', 'social'], difficulty: 'intermediate' },
    { title: 'Marketing Analytics and Data Analysis', duration: 4500, tags: ['analytics', 'data-driven', 'metrics'], difficulty: 'intermediate' }
  ],

  'Financial Literacy & Investing': [
    { title: 'Personal Finance Fundamentals', duration: 3600, tags: ['personal-finance', 'budgeting', 'money-management'], difficulty: 'beginner' },
    { title: 'Stock Market Investing for Beginners', duration: 4200, tags: ['stock-market', 'investing', 'equities'], difficulty: 'beginner' },
    { title: 'Cryptocurrency and Blockchain Basics', duration: 3300, tags: ['cryptocurrency', 'blockchain', 'digital-assets'], difficulty: 'intermediate' },
    { title: 'Real Estate Investment Strategies', duration: 4500, tags: ['real-estate', 'property-investment', 'passive-income'], difficulty: 'intermediate' },
    { title: 'Retirement Planning and 401k Optimization', duration: 2700, tags: ['retirement-planning', '401k', 'long-term-investing'], difficulty: 'intermediate' },
    { title: 'Tax Strategies and Optimization', duration: 3000, tags: ['tax-planning', 'tax-optimization', 'deductions'], difficulty: 'intermediate' },
    { title: 'Building Multiple Income Streams', duration: 3900, tags: ['multiple-income', 'passive-income', 'wealth-building'], difficulty: 'intermediate' },
    { title: 'Advanced Portfolio Management', duration: 5400, tags: ['portfolio-management', 'asset-allocation', 'diversification'], difficulty: 'advanced' }
  ],

  // Academic Genres
  'Mathematics': [
    { title: 'Algebra Fundamentals', duration: 2700, tags: ['algebra', 'equations', 'mathematics'], difficulty: 'beginner' },
    { title: 'Calculus Made Simple', duration: 4200, tags: ['calculus', 'derivatives', 'integrals'], difficulty: 'intermediate' },
    { title: 'Statistics and Probability', duration: 3600, tags: ['statistics', 'probability', 'data-analysis'], difficulty: 'intermediate' },
    { title: 'Linear Algebra for Engineers', duration: 5400, tags: ['linear-algebra', 'matrices', 'vectors'], difficulty: 'advanced' },
    { title: 'Geometry and Trigonometry', duration: 3000, tags: ['geometry', 'trigonometry', 'shapes'], difficulty: 'intermediate' },
    { title: 'Discrete Mathematics', duration: 4500, tags: ['discrete-math', 'logic', 'algorithms'], difficulty: 'advanced' },
    { title: 'Mathematical Problem Solving', duration: 2400, tags: ['problem-solving', 'techniques', 'strategies'], difficulty: 'intermediate' },
    { title: 'Number Theory Basics', duration: 3300, tags: ['number-theory', 'primes', 'modular-arithmetic'], difficulty: 'advanced' }
  ],

  'Physics': [
    { title: 'Classical Mechanics Fundamentals', duration: 4800, tags: ['mechanics', 'motion', 'forces'], difficulty: 'intermediate' },
    { title: 'Electricity and Magnetism', duration: 5400, tags: ['electricity', 'magnetism', 'fields'], difficulty: 'intermediate' },
    { title: 'Quantum Physics Introduction', duration: 6000, tags: ['quantum', 'physics', 'particles'], difficulty: 'advanced' },
    { title: 'Thermodynamics and Heat', duration: 3600, tags: ['thermodynamics', 'heat', 'energy'], difficulty: 'intermediate' },
    { title: 'Waves and Optics', duration: 4200, tags: ['waves', 'optics', 'light'], difficulty: 'intermediate' },
    { title: 'Relativity Theory Explained', duration: 4500, tags: ['relativity', 'einstein', 'spacetime'], difficulty: 'advanced' },
    { title: 'Astrophysics and Cosmology', duration: 5100, tags: ['astrophysics', 'cosmology', 'universe'], difficulty: 'advanced' },
    { title: 'Physics Problem Solving', duration: 2700, tags: ['problem-solving', 'physics', 'techniques'], difficulty: 'intermediate' }
  ],

  'Biology': [
    { title: 'Cell Biology Fundamentals', duration: 3600, tags: ['cell-biology', 'organelles', 'cellular-processes'], difficulty: 'beginner' },
    { title: 'Genetics and Heredity', duration: 4200, tags: ['genetics', 'dna', 'heredity'], difficulty: 'intermediate' },
    { title: 'Human Anatomy and Physiology', duration: 6300, tags: ['anatomy', 'physiology', 'human-body'], difficulty: 'intermediate' },
    { title: 'Evolution and Natural Selection', duration: 3900, tags: ['evolution', 'natural-selection', 'darwin'], difficulty: 'intermediate' },
    { title: 'Ecology and Environmental Science', duration: 4500, tags: ['ecology', 'environment', 'ecosystems'], difficulty: 'intermediate' },
    { title: 'Molecular Biology', duration: 5400, tags: ['molecular-biology', 'proteins', 'dna'], difficulty: 'advanced' },
    { title: 'Microbiology and Immunology', duration: 4800, tags: ['microbiology', 'bacteria', 'immune-system'], difficulty: 'advanced' },
    { title: 'Plant Biology and Botany', duration: 3300, tags: ['plant-biology', 'botany', 'photosynthesis'], difficulty: 'intermediate' }
  ],

  'Chemistry': [
    { title: 'General Chemistry Principles', duration: 4500, tags: ['general-chemistry', 'atoms', 'molecules'], difficulty: 'beginner' },
    { title: 'Organic Chemistry Fundamentals', duration: 5700, tags: ['organic-chemistry', 'carbon', 'reactions'], difficulty: 'intermediate' },
    { title: 'Physical Chemistry', duration: 5400, tags: ['physical-chemistry', 'thermodynamics', 'kinetics'], difficulty: 'advanced' },
    { title: 'Inorganic Chemistry', duration: 4200, tags: ['inorganic-chemistry', 'metals', 'minerals'], difficulty: 'intermediate' }
  ],

  // Career & Professional Development
  'Resume Building & Job Hunting': [
    { title: 'Creating a Winning Resume', duration: 2400, tags: ['resume', 'cv', 'job-application'], difficulty: 'beginner' },
    { title: 'LinkedIn Profile Optimization', duration: 1800, tags: ['linkedin', 'profile', 'networking'], difficulty: 'beginner' },
    { title: 'Job Search Strategies 2024', duration: 3000, tags: ['job-search', 'strategies', 'career'], difficulty: 'intermediate' },
    { title: 'Cover Letter Writing Mastery', duration: 1500, tags: ['cover-letter', 'writing', 'application'], difficulty: 'beginner' },
    { title: 'Salary Negotiation Tactics', duration: 2700, tags: ['salary', 'negotiation', 'career-growth'], difficulty: 'intermediate' },
    { title: 'Career Change Roadmap', duration: 3600, tags: ['career-change', 'transition', 'roadmap'], difficulty: 'intermediate' },
    { title: 'Networking for Professionals', duration: 2100, tags: ['networking', 'professional', 'connections'], difficulty: 'intermediate' },
    { title: 'Personal Branding for Career Success', duration: 2700, tags: ['personal-branding', 'career', 'success'], difficulty: 'intermediate' }
  ],

  'Interview Preparation': [
    { title: 'Common Interview Questions', duration: 2100, tags: ['interview', 'questions', 'preparation'], difficulty: 'beginner' },
    { title: 'Technical Interview Strategies', duration: 3300, tags: ['technical-interview', 'coding', 'algorithms'], difficulty: 'intermediate' },
    { title: 'Behavioral Interview Mastery', duration: 2700, tags: ['behavioral-interview', 'star-method', 'stories'], difficulty: 'intermediate' },
    { title: 'Virtual Interview Best Practices', duration: 1800, tags: ['virtual-interview', 'online', 'video-call'], difficulty: 'beginner' }
  ],

  // Tech News & Trends
  'Tech News & Product Launches': [
    { title: 'Latest iPhone Features Review', duration: 1200, tags: ['iphone', 'apple', 'product-review'], difficulty: 'beginner' },
    { title: 'Google I/O 2024 Highlights', duration: 1800, tags: ['google', 'io', 'conference'], difficulty: 'beginner' },
    { title: 'Microsoft Build Conference Recap', duration: 1500, tags: ['microsoft', 'build', 'azure'], difficulty: 'intermediate' },
    { title: 'Tesla Software Update Analysis', duration: 900, tags: ['tesla', 'software', 'automotive'], difficulty: 'beginner' },
    { title: 'Meta VR Headset Comparison', duration: 1800, tags: ['meta', 'vr', 'virtual-reality'], difficulty: 'intermediate' },
    { title: 'Samsung Galaxy Features Deep Dive', duration: 1500, tags: ['samsung', 'galaxy', 'android'], difficulty: 'beginner' },
    { title: 'NVIDIA GPU Benchmark Tests', duration: 2100, tags: ['nvidia', 'gpu', 'gaming'], difficulty: 'intermediate' },
    { title: 'AWS New Services Overview', duration: 2400, tags: ['aws', 'cloud', 'services'], difficulty: 'intermediate' }
  ],

  'AI & Innovation': [
    { title: 'ChatGPT vs Other AI Models', duration: 1800, tags: ['chatgpt', 'ai', 'comparison'], difficulty: 'beginner' },
    { title: 'Machine Learning Breakthroughs 2024', duration: 2700, tags: ['ml', 'breakthroughs', 'research'], difficulty: 'intermediate' },
    { title: 'Autonomous Vehicles Progress Update', duration: 2100, tags: ['autonomous', 'vehicles', 'ai'], difficulty: 'intermediate' },
    { title: 'AI in Healthcare Applications', duration: 2400, tags: ['ai', 'healthcare', 'medical'], difficulty: 'intermediate' },
    { title: 'Robotics Industry Trends', duration: 1800, tags: ['robotics', 'automation', 'industry'], difficulty: 'intermediate' },
    { title: 'Neural Network Architectures Explained', duration: 3000, tags: ['neural-networks', 'architecture', 'deep-learning'], difficulty: 'advanced' },
    { title: 'Quantum Computing Updates', duration: 2700, tags: ['quantum', 'computing', 'innovation'], difficulty: 'advanced' },
    { title: 'AI Ethics and Regulation', duration: 2100, tags: ['ai-ethics', 'regulation', 'policy'], difficulty: 'intermediate' }
  ],

  // Mind-expanding & Curiosity Genres
  'Did You Know / Trivia': [
    { title: 'Amazing Facts About Space', duration: 900, tags: ['space', 'facts', 'astronomy'], difficulty: 'beginner' },
    { title: 'Weird Animal Behaviors', duration: 1200, tags: ['animals', 'behavior', 'nature'], difficulty: 'beginner' },
    { title: 'Historical Mysteries Explained', duration: 1800, tags: ['history', 'mysteries', 'unsolved'], difficulty: 'beginner' },
    { title: 'Science Facts That Sound Fake', duration: 1500, tags: ['science', 'facts', 'surprising'], difficulty: 'beginner' },
    { title: 'Language Origins and Evolution', duration: 2100, tags: ['language', 'linguistics', 'evolution'], difficulty: 'intermediate' },
    { title: 'Mathematical Curiosities', duration: 1800, tags: ['mathematics', 'curiosities', 'patterns'], difficulty: 'intermediate' },
    { title: 'Psychology of Color Perception', duration: 1200, tags: ['psychology', 'color', 'perception'], difficulty: 'intermediate' },
    { title: 'Cultural Traditions Around the World', duration: 2400, tags: ['culture', 'traditions', 'anthropology'], difficulty: 'beginner' }
  ],

  // DIY & Hands-on Learning
  'Robotics & IoT': [
    { title: 'Arduino for Beginners', duration: 3600, tags: ['arduino', 'microcontroller', 'electronics'], difficulty: 'beginner' },
    { title: 'Raspberry Pi Home Automation', duration: 4200, tags: ['raspberry-pi', 'automation', 'iot'], difficulty: 'intermediate' },
    { title: 'Building Your First Robot', duration: 5400, tags: ['robotics', 'building', 'diy'], difficulty: 'intermediate' },
    { title: 'IoT Security Best Practices', duration: 2700, tags: ['iot', 'security', 'cybersecurity'], difficulty: 'intermediate' },
    { title: 'Sensor Integration and Programming', duration: 3000, tags: ['sensors', 'programming', 'integration'], difficulty: 'intermediate' },
    { title: 'Smart Home Setup Guide', duration: 3300, tags: ['smart-home', 'automation', 'setup'], difficulty: 'beginner' },
    { title: 'Drone Building and Programming', duration: 4800, tags: ['drone', 'building', 'programming'], difficulty: 'advanced' },
    { title: 'Industrial IoT Applications', duration: 3900, tags: ['industrial-iot', 'manufacturing', 'automation'], difficulty: 'advanced' }
  ],

  // Lifestyle Learning
  'Health & Fitness': [
    { title: 'Complete Beginner Workout Plan', duration: 2700, tags: ['workout', 'fitness', 'beginner'], difficulty: 'beginner' },
    { title: 'Yoga for Stress Relief', duration: 3000, tags: ['yoga', 'stress', 'mindfulness'], difficulty: 'beginner' },
    { title: 'HIIT Training Fundamentals', duration: 2400, tags: ['hiit', 'cardio', 'training'], difficulty: 'intermediate' },
    { title: 'Strength Training for Women', duration: 3300, tags: ['strength', 'training', 'women'], difficulty: 'intermediate' },
    { title: 'Running Technique and Form', duration: 1800, tags: ['running', 'technique', 'form'], difficulty: 'beginner' },
    { title: 'Injury Prevention and Recovery', duration: 2700, tags: ['injury', 'prevention', 'recovery'], difficulty: 'intermediate' },
    { title: 'Sports Psychology and Mental Training', duration: 3600, tags: ['sports-psychology', 'mental', 'training'], difficulty: 'intermediate' },
    { title: 'Elderly Fitness and Mobility', duration: 2100, tags: ['elderly', 'fitness', 'mobility'], difficulty: 'beginner' }
  ],

  'Mental Health & Wellness': [
    { title: 'Understanding Anxiety and Depression', duration: 3300, tags: ['anxiety', 'depression', 'mental-health'], difficulty: 'beginner' },
    { title: 'Mindfulness and Meditation Basics', duration: 2400, tags: ['mindfulness', 'meditation', 'wellness'], difficulty: 'beginner' },
    { title: 'Stress Management Techniques', duration: 2700, tags: ['stress', 'management', 'coping'], difficulty: 'beginner' },
    { title: 'Building Emotional Resilience', duration: 3000, tags: ['resilience', 'emotional', 'strength'], difficulty: 'intermediate' },
    { title: 'Sleep Hygiene and Better Rest', duration: 2100, tags: ['sleep', 'hygiene', 'rest'], difficulty: 'beginner' },
    { title: 'Cognitive Behavioral Therapy Basics', duration: 4200, tags: ['cbt', 'therapy', 'psychology'], difficulty: 'intermediate' },
    { title: 'Work-Life Balance Strategies', duration: 2400, tags: ['work-life', 'balance', 'wellness'], difficulty: 'intermediate' },
    { title: 'Self-Care Routine Development', duration: 1800, tags: ['self-care', 'routine', 'wellness'], difficulty: 'beginner' }
  ]
};

// Enhanced user personas
const userPersonas = [
  {
    type: 'Developer',
    preferences: ['Coding and Programming', 'Data Science and AI/ML', 'Tech News & Product Launches', 'AI & Innovation'],
    engagementLevel: 'high',
    avgSessionTime: 3600,
    completionRate: 0.75,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Student',
    preferences: ['Mathematics', 'Physics', 'Biology', 'Chemistry'],
    engagementLevel: 'medium',
    avgSessionTime: 1800,
    completionRate: 0.60,
    experienceLevel: 'beginner'
  },
  {
    type: 'Health Enthusiast',
    preferences: ['Health & Fitness', 'Mental Health & Wellness', 'Did You Know / Trivia'],
    engagementLevel: 'medium',
    avgSessionTime: 2100,
    completionRate: 0.70,
    experienceLevel: 'beginner'
  },
  {
    type: 'Tech Enthusiast',
    preferences: ['Tech News & Product Launches', 'AI & Innovation', 'Robotics & IoT'],
    engagementLevel: 'high',
    avgSessionTime: 2700,
    completionRate: 0.65,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Career Focused',
    preferences: ['Resume Building & Job Hunting', 'Interview Preparation', 'Digital Marketing'],
    engagementLevel: 'medium',
    avgSessionTime: 2400,
    completionRate: 0.55,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Academic',
    preferences: ['Mathematics', 'Physics', 'Biology', 'Chemistry'],
    engagementLevel: 'high',
    avgSessionTime: 4200,
    completionRate: 0.85,
    experienceLevel: 'advanced'
  },
  {
    type: 'DIY Maker',
    preferences: ['Robotics & IoT', 'Did You Know / Trivia', 'Tech News & Product Launches'],
    engagementLevel: 'high',
    avgSessionTime: 3900,
    completionRate: 0.75,
    experienceLevel: 'intermediate'
  },
  {
    type: 'Wellness Seeker',
    preferences: ['Mental Health & Wellness', 'Health & Fitness', 'Did You Know / Trivia'],
    engagementLevel: 'medium',
    avgSessionTime: 2400,
    completionRate: 0.65,
    experienceLevel: 'beginner'
  }
];

function generateUsers(count = 120) {
  const users = [];
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const persona = userPersonas[Math.floor(Math.random() * userPersonas.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    users.push({
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
      name: `${firstName} ${lastName}`,
      persona: persona.type,
      preferences: persona.preferences,
      engagementLevel: persona.engagementLevel,
      avgSessionTime: persona.avgSessionTime,
      completionRate: persona.completionRate,
      experienceLevel: persona.experienceLevel
    });
  }
  
  return users;
}

async function connectDB() {
  try {
    const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function seedExpandedData() {
  try {
    await connectDB();
    
    // Define schemas
    const UserSchema = new mongoose.Schema({
      username: String,
      email: String,
      name: String,
      persona: String,
      preferences: [String],
      engagementLevel: String,
      avgSessionTime: Number,
      completionRate: Number,
      experienceLevel: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const ContentSchema = new mongoose.Schema({
      title: String,
      category: String,
      duration: Number,
      type: String,
      tags: [String],
      difficulty: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const ViewingHistorySchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
      itemType: { type: String, default: 'video' },
      title: String,
      category: String,
      viewStartTime: Date,
      viewEndTime: Date,
      totalViewDuration: Number,
      actualDuration: Number,
      completionPercentage: Number,
      pauseCount: { type: Number, default: 0 },
      seekCount: { type: Number, default: 0 },
      skipCount: { type: Number, default: 0 },
      replayCount: { type: Number, default: 0 },
      viewingContext: {
        source: { type: String, default: 'homepage' },
        device: String,
        sessionId: String
      },
      averagePlaybackSpeed: { type: Number, default: 1.0 },
      isActive: { type: Boolean, default: true }
    }, { timestamps: true });
    
    const User = mongoose.model('User', UserSchema);
    const Content = mongoose.model('Content', ContentSchema);
    const ViewingHistory = mongoose.model('UserViewingHistory', ViewingHistorySchema);
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Content.deleteMany({});
    await ViewingHistory.deleteMany({});
    
    // Generate and insert users
    console.log('👥 Generating 120 users with expanded personas...');
    const userData = generateUsers(120);
    const users = await User.insertMany(userData);
    console.log(`✅ Created ${users.length} users`);
    
    // Generate and insert content
    console.log('📚 Generating content for all expanded categories...');
    const allContent = [];
    
    Object.entries(contentByCategory).forEach(([category, videos]) => {
      videos.forEach(video => {
        allContent.push({
          ...video,
          category,
          type: 'video'
        });
      });
    });
    
    const contentDocs = await Content.insertMany(allContent);
    console.log(`✅ Created ${contentDocs.length} content items across ${Object.keys(contentByCategory).length} categories`);
    
    // Generate viewing history
    console.log('📊 Generating comprehensive viewing history...');
    const viewingHistoryEntries = [];
    
    for (const user of users) {
      const numSessions = Math.floor(Math.random() * 8) + 8;
      
      const preferredContent = contentDocs.filter(content => 
        user.preferences.includes(content.category)
      );
      
      const randomContent = contentDocs.filter(content => 
        !user.preferences.includes(content.category)
      ).slice(0, Math.floor(contentDocs.length * 0.2));
      
      const availableContent = [...preferredContent, ...randomContent];
      
      for (let i = 0; i < numSessions; i++) {
        if (availableContent.length === 0) continue;
        
        const selectedContent = availableContent[Math.floor(Math.random() * availableContent.length)];
        
        const daysAgo = Math.floor(Math.random() * 60);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysAgo);
        startTime.setHours(Math.floor(Math.random() * 14) + 8);
        
        let baseWatchTime = user.avgSessionTime;
        
        if (selectedContent.difficulty === 'beginner' && user.experienceLevel === 'advanced') {
          baseWatchTime *= 0.7;
        } else if (selectedContent.difficulty === 'advanced' && user.experienceLevel === 'beginner') {
          baseWatchTime *= 0.4;
        }
        
        const maxWatchTime = Math.min(selectedContent.duration, baseWatchTime);
        const watchTime = Math.max(300, maxWatchTime * (0.5 + Math.random() * 0.5));
        
        const completionPercentage = Math.min(100, (watchTime / selectedContent.duration) * 100);
        const endTime = new Date(startTime.getTime() + watchTime * 1000);
        
        viewingHistoryEntries.push({
          userId: user._id,
          itemId: selectedContent._id,
          itemType: selectedContent.type,
          title: selectedContent.title,
          category: selectedContent.category,
          viewStartTime: startTime,
          viewEndTime: endTime,
          totalViewDuration: Math.floor(watchTime),
          actualDuration: selectedContent.duration,
          completionPercentage: Math.round(completionPercentage),
          pauseCount: Math.floor(Math.random() * 6),
          seekCount: Math.floor(Math.random() * 12),
          skipCount: Math.floor(Math.random() * 3),
          replayCount: Math.floor(Math.random() * 2),
          viewingContext: {
            source: ['homepage', 'search', 'recommendations', 'category'][Math.floor(Math.random() * 4)],
            device: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
            sessionId: new mongoose.Types.ObjectId().toString()
          },
          averagePlaybackSpeed: 1.0 + (Math.random() - 0.5) * 0.5,
          isActive: true
        });
      }
    }
    
    // Insert viewing history in batches
    console.log('💾 Inserting viewing history...');
    const batchSize = 100;
    for (let i = 0; i < viewingHistoryEntries.length; i += batchSize) {
      const batch = viewingHistoryEntries.slice(i, i + batchSize);
      await ViewingHistory.insertMany(batch);
      console.log(`   Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(viewingHistoryEntries.length/batchSize)}`);
    }
    
    console.log(`✅ Created ${viewingHistoryEntries.length} viewing history entries`);
    
    // Generate summary
    console.log('\n📈 Expanded Data Generation Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`📚 Content items: ${contentDocs.length}`);
    console.log(`👀 Viewing entries: ${viewingHistoryEntries.length}`);
    console.log(`📂 Categories: ${Object.keys(contentByCategory).length}`);
    
    // Category breakdown
    console.log('\n📊 Content by Category:');
    Object.entries(contentByCategory).forEach(([category, videos]) => {
      console.log(`  ${category}: ${videos.length} videos`);
    });
    
    console.log('\n🎉 Expanded data generation completed!');
    console.log('🚀 Your recommendation engine now has diverse, realistic data across multiple genres!');
    
  } catch (error) {
    console.error('❌ Error generating data:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Check if running directly
if (require.main === module) {
  seedExpandedData();
}

module.exports = { seedExpandedData }; 