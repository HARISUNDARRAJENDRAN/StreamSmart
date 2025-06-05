const mongoose = require('mongoose');

// Sample content data representing different categories and types
const sampleContent = [
  // Technology & Programming
  { title: 'Introduction to JavaScript', category: 'Programming', duration: 3600, type: 'course', tags: ['javascript', 'web development', 'beginner'] },
  { title: 'React Fundamentals', category: 'Programming', duration: 4800, type: 'course', tags: ['react', 'frontend', 'javascript'] },
  { title: 'Node.js Backend Development', category: 'Programming', duration: 5400, type: 'course', tags: ['nodejs', 'backend', 'javascript'] },
  { title: 'Python for Data Science', category: 'Data Science', duration: 6000, type: 'course', tags: ['python', 'data science', 'machine learning'] },
  { title: 'Machine Learning Basics', category: 'Data Science', duration: 4200, type: 'course', tags: ['ml', 'python', 'algorithms'] },
  
  // Business & Marketing
  { title: 'Digital Marketing Strategy', category: 'Marketing', duration: 3000, type: 'course', tags: ['marketing', 'digital', 'strategy'] },
  { title: 'Entrepreneurship 101', category: 'Business', duration: 3900, type: 'course', tags: ['business', 'startup', 'entrepreneur'] },
  { title: 'Project Management', category: 'Business', duration: 3300, type: 'course', tags: ['management', 'project', 'agile'] },
  
  // Design & Creative
  { title: 'UI/UX Design Principles', category: 'Design', duration: 4500, type: 'course', tags: ['design', 'ui', 'ux'] },
  { title: 'Photoshop Masterclass', category: 'Design', duration: 5100, type: 'course', tags: ['photoshop', 'graphics', 'design'] },
  
  // Health & Fitness
  { title: 'Yoga for Beginners', category: 'Health', duration: 1800, type: 'workout', tags: ['yoga', 'fitness', 'beginner'] },
  { title: 'HIIT Workout', category: 'Fitness', duration: 1200, type: 'workout', tags: ['hiit', 'cardio', 'fitness'] },
  
  // Entertainment
  { title: 'Comedy Special 2024', category: 'Entertainment', duration: 3600, type: 'show', tags: ['comedy', 'entertainment', 'humor'] },
  { title: 'Tech Documentary', category: 'Documentary', duration: 5400, type: 'documentary', tags: ['technology', 'documentary', 'innovation'] },
  { title: 'Cooking Masterclass', category: 'Lifestyle', duration: 2700, type: 'tutorial', tags: ['cooking', 'food', 'tutorial'] }
];

// User behavior patterns for realistic viewing history
const userProfiles = {
  'binge_watcher': {
    avgSessionTime: 4500, // 75 minutes
    completionRate: 0.85,
    preferredCategories: ['Entertainment', 'Documentary'],
    sessionFrequency: 'evening',
    contentTypes: ['show', 'documentary', 'course']
  },
  'active_explorer': {
    avgSessionTime: 2100, // 35 minutes
    completionRate: 0.65,
    preferredCategories: ['Programming', 'Design', 'Business'],
    sessionFrequency: 'varied',
    contentTypes: ['course', 'tutorial']
  },
  'focused_learner': {
    avgSessionTime: 3300, // 55 minutes
    completionRate: 0.90,
    preferredCategories: ['Programming', 'Data Science', 'Business'],
    sessionFrequency: 'consistent',
    contentTypes: ['course']
  },
  'casual_viewer': {
    avgSessionTime: 1800, // 30 minutes
    completionRate: 0.45,
    preferredCategories: ['Entertainment', 'Health', 'Lifestyle'],
    sessionFrequency: 'weekend',
    contentTypes: ['show', 'workout', 'tutorial']
  }
};

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/streamsmart');
    console.log('🔗 Connected to MongoDB');
    
    // Define schemas
    const ContentSchema = new mongoose.Schema({
      title: String,
      category: String,
      duration: Number,
      type: String,
      tags: [String],
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
        sessionId: { type: String, default: () => new mongoose.Types.ObjectId().toString() }
      },
      averagePlaybackSpeed: { type: Number, default: 1.0 },
      qualityChanges: { type: Number, default: 0 },
      bufferingEvents: { type: Number, default: 0 },
      fullScreenUsed: { type: Boolean, default: false },
      volumeAdjustments: { type: Number, default: 0 },
      captionsEnabled: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true }
    }, { timestamps: true });
    
    const Content = mongoose.model('Content', ContentSchema);
    const ViewingHistory = mongoose.model('UserViewingHistory', ViewingHistorySchema);
    
    // Get existing users
    const UserSchema = new mongoose.Schema({
      email: String,
      username: String,
      name: String
    });
    const User = mongoose.model('User', UserSchema);
    const users = await User.find({});
    
    console.log(`👥 Found ${users.length} users`);
    
    if (users.length < 2) {
      console.log('❌ Need at least 2 users for clustering. Please create more users first.');
      return;
    }
    
    // Clear existing content and viewing history
    await Content.deleteMany({});
    await ViewingHistory.deleteMany({});
    console.log('🧹 Cleared existing content and viewing history');
    
    // Insert content
    const contentDocs = await Content.insertMany(sampleContent);
    console.log(`📚 Created ${contentDocs.length} content items`);
    
    // Assign user profiles and generate viewing history
    const profileTypes = Object.keys(userProfiles);
    const viewingHistoryEntries = [];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const profileType = profileTypes[i % profileTypes.length];
      const profile = userProfiles[profileType];
      
      console.log(`👤 Generating data for user ${user.email} (${profileType})`);
      
      // Generate 15-25 viewing entries per user over the last 30 days
      const numEntries = Math.floor(Math.random() * 11) + 15; // 15-25 entries
      
      for (let j = 0; j < numEntries; j++) {
        // Select content based on user profile preferences
        const preferredContent = contentDocs.filter(content => 
          profile.preferredCategories.includes(content.category) ||
          profile.contentTypes.includes(content.type)
        );
        
        const selectedContent = preferredContent.length > 0 
          ? preferredContent[Math.floor(Math.random() * preferredContent.length)]
          : contentDocs[Math.floor(Math.random() * contentDocs.length)];
        
        // Generate realistic viewing session
        const daysAgo = Math.floor(Math.random() * 30);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysAgo);
        startTime.setHours(
          profile.sessionFrequency === 'evening' ? Math.floor(Math.random() * 4) + 18 :
          profile.sessionFrequency === 'weekend' ? Math.floor(Math.random() * 8) + 10 :
          Math.floor(Math.random() * 14) + 8
        );
        
        // Calculate watch time based on user profile
        const baseWatchTime = Math.min(
          selectedContent.duration,
          profile.avgSessionTime + (Math.random() - 0.5) * 1800 // ±15 min variance
        );
        const watchTime = Math.max(300, baseWatchTime); // Minimum 5 minutes
        
        const completionPercentage = Math.min(100, (watchTime / selectedContent.duration) * 100);
        const completed = completionPercentage >= 80 && Math.random() < profile.completionRate;
        
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
          pauseCount: Math.floor(Math.random() * 5),
          seekCount: Math.floor(Math.random() * 10),
          skipCount: Math.floor(Math.random() * 3),
          replayCount: Math.floor(Math.random() * 2),
          viewingContext: {
            source: 'homepage',
            device: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
            sessionId: new mongoose.Types.ObjectId().toString()
          },
          averagePlaybackSpeed: 1.0 + (Math.random() - 0.5) * 0.5,
          qualityChanges: Math.floor(Math.random() * 5),
          bufferingEvents: Math.floor(Math.random() * 10),
          fullScreenUsed: Math.random() < 0.5,
          volumeAdjustments: Math.floor(Math.random() * 100),
          captionsEnabled: Math.random() < 0.5,
          isActive: true
        });
      }
    }
    
    // Insert viewing history
    await ViewingHistory.insertMany(viewingHistoryEntries);
    console.log(`📊 Created ${viewingHistoryEntries.length} viewing history entries`);
    
    // Print summary
    console.log('\n📈 Data Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`📚 Content items: ${contentDocs.length}`);
    console.log(`👀 Viewing entries: ${viewingHistoryEntries.length}`);
    
    const userViewingCounts = await ViewingHistory.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 }, totalWatchTime: { $sum: '$totalViewDuration' } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n👤 User viewing statistics:');
    for (const stat of userViewingCounts) {
      const user = users.find(u => u._id.toString() === stat._id.toString());
      const profileType = profileTypes[users.indexOf(user) % profileTypes.length];
      console.log(`  ${user.email} (${profileType}): ${stat.count} views, ${Math.round(stat.totalWatchTime/3600)}h total`);
    }
    
    console.log('\n✅ Sample data created successfully!');
    console.log('🚀 Ready to test segment-aware recommendations!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedData(); 