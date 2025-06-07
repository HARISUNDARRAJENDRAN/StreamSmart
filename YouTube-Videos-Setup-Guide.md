# 🎬 YouTube Videos Population Guide

This guide will help you populate all subcategories with **real YouTube videos** (100+ videos per subcategory).

## 📋 Prerequisites

### 1. YouTube API Key
You need a YouTube Data API v3 key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**
4. Create credentials (API Key)
5. Add your API key to `.env` file:

```bash
YOUTUBE_API_KEY=your_api_key_here
```

### 2. Required Dependencies
Install node-fetch if not already installed:

```bash
npm install node-fetch
```

## 🚀 Quick Start

### Option 1: Populate Priority Subcategories (Recommended)
```bash
node populate-specific-subcategories.js
```

This will populate 8 priority subcategories:
- Coding and Programming
- Data Science and AI/ML
- Design(UI/UX , graphic, product)
- Digital Marketing
- Mathematics
- Physics
- Health & Fitness
- Personal Development & Mental Health

### Option 2: Populate ALL Subcategories
```bash
node populate-specific-subcategories.js --all
```

### Option 3: Populate Specific Subcategory
```bash
node populate-specific-subcategories.js "Coding and Programming" 150
```

## 📊 All Available Subcategories

### 🛠️ Skill-Based Genres (10 categories)
- Coding and Programming
- Data Science and AI/ML
- Design(UI/UX , graphic, product)
- Digital Marketing
- Productivity & Time Management
- Financial Literacy & Investing
- Soft Skills (Communication, Leadership)
- Entrepreneurship & Startups
- Writing & Content Creation
- Public Speaking

### 🎓 Academic Genres (7 categories)
- Mathematics
- Physics
- Chemistry
- Biology
- History
- Geography
- Language Learning

### 💼 Career & Professional Development (3 categories)
- Resume Building & Job Hunting
- Interview Preparation
- Workplace Skills

### 💻 Tech News & Trends (4 categories)
- Tech News & Product Launches
- Cybersecurity
- Cloud Computing
- Artificial Intelligence

### 🧠 Mind-expanding & Curiosity (3 categories)
- Did You Know / Trivia
- Philosophy & Critical Thinking
- Psychology & Human Behavior

### 🔧 DIY & Hands-on Learning (3 categories)
- Robotics & IoT
- Electronics & Circuits
- Crafts & Artistic Skills

### 🌱 Lifestyle & Wellness (3 categories)
- Health & Fitness
- Cooking & Nutrition
- Personal Development & Mental Health

**Total: 33 subcategories × 100+ videos = 3,300+ videos**

## 🔍 Verification & Monitoring

### Check Overall Progress
```bash
node verify-youtube-videos.js
```

Sample output:
```
📊 Total videos in database: 2,450

📋 Videos per subcategory:
================================================================================
✅ Coding and Programming                  │ 142 │ ████████████████████
✅ Data Science and AI/ML                  │ 128 │ ████████████████████
⚠️ Mathematics                             │  67 │ █████████████░░░░░░░
❌ Philosophy & Critical Thinking          │  23 │ ████░░░░░░░░░░░░░░░░
```

### Check Specific Category Details
```bash
node verify-youtube-videos.js "Coding and Programming"
```

## 🎯 Advanced Usage

### Populate Large Quantities
For subcategories that need more than 100 videos:
```bash
node populate-specific-subcategories.js "Coding and Programming" 200
```

### Batch Processing Multiple Categories
Create a custom script:
```javascript
const { populateMultipleSubcategories } = require('./populate-specific-subcategories');

const myCategories = [
  'Coding and Programming',
  'Data Science and AI/ML',
  'Mathematics'
];

populateMultipleSubcategories(myCategories, 150);
```

## 📈 Features & Quality Control

### 🔍 Smart Filtering
- **Duration Filter**: Only videos between 2 minutes and 4 hours
- **Quality Filter**: Excludes very low-view or spam content
- **Relevance Ranking**: Uses YouTube's relevance algorithm
- **Duplicate Prevention**: Automatic deduplication by YouTube ID

### 🏷️ Automatic Tagging
- **Difficulty Detection**: Beginner/Intermediate/Advanced based on title/description
- **Category Tagging**: Automatic subcategory tags
- **Original Tags**: Preserves YouTube video tags

### 📊 Rich Metadata
Each video includes:
- YouTube ID and URL
- Title and description
- High-quality thumbnail
- Duration (formatted)
- Channel information
- View count and likes
- Publication date
- Difficulty level
- Category tags

## ⚠️ Rate Limiting & Best Practices

### API Rate Limits
- YouTube API has quotas (10,000 units/day by default)
- Each search uses ~100 units
- Each video details call uses ~1 unit per video
- Built-in delays between requests (200ms)

### Recommendations
1. **Start Small**: Test with 1-2 categories first
2. **Monitor Progress**: Use verification script frequently
3. **Spread Over Time**: Don't try to populate everything at once
4. **Check Quality**: Review sample videos in each category

## 🐛 Troubleshooting

### Common Issues

**"YOUTUBE_API_KEY is not set"**
```bash
# Add to your .env file
echo "YOUTUBE_API_KEY=your_key_here" >> .env
```

**"Quota exceeded"**
- Wait 24 hours for quota reset
- Or request quota increase from Google Cloud Console

**"No videos found for query"**
- Some categories might have very specific search terms
- The script will try multiple search queries automatically

**"Database connection failed"**
- Check your MongoDB connection string
- Ensure MongoDB is running

### Getting Help
1. Check the console output for detailed error messages
2. Use verification script to see current status
3. Start with small batches to test your setup

## 📱 Integration with Frontend

Once populated, your subcategories will automatically show real YouTube videos in your dashboard. The videos include:

- **Thumbnails**: High-quality YouTube thumbnails
- **Duration**: Properly formatted duration
- **Channel Info**: Creator names and channels
- **Direct Links**: Working YouTube URLs
- **Rich Metadata**: For better recommendations

## 🎉 Expected Results

After full population, you'll have:
- **3,300+ real YouTube videos** across all subcategories
- **Professional content** from established educational channels
- **Diverse difficulty levels** (beginner to advanced)
- **Rich metadata** for recommendation engine
- **High-quality thumbnails** for better UI
- **Working YouTube links** for seamless viewing

The system will provide a much more engaging and professional experience for your users!

---

**Happy populating! 🚀** 