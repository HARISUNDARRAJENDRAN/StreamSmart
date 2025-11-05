/**
 * TEST SCRIPT - Run this in YouTube video page console to diagnose issues
 * Usage: Open YouTube video → F12 → Console → Copy and paste this entire script
 */

console.log('🔍 StreamSmart Extension Diagnostic Tool\n');

// Test 1: Check if on YouTube watch page
console.log('📹 Test 1: Video Page Check');
const isYouTube = window.location.hostname.includes('youtube.com');
const isWatchPage = window.location.pathname === '/watch';
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get('v');
console.log(`   YouTube: ${isYouTube ? '✅' : '❌'}`);
console.log(`   Watch Page: ${isWatchPage ? '✅' : '❌'}`);
console.log(`   Video ID: ${videoId || '❌ NOT FOUND'}\n`);

// Test 2: Check transcript panel
console.log('📝 Test 2: Transcript Panel Check');
const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
console.log(`   Segments Found: ${transcriptSegments.length}`);

if (transcriptSegments.length === 0) {
  console.warn('   ⚠️  NO TRANSCRIPT SEGMENTS FOUND!');
  console.warn('   ');
  console.warn('   SOLUTION:');
  console.warn('   1. Click the "..." button below the video');
  console.warn('   2. Click "Show transcript"');
  console.warn('   3. Wait for transcript panel to appear on the right');
  console.warn('   4. Run this test script again\n');
} else {
  console.log(`   ✅ ${transcriptSegments.length} segments available`);
  
  // Show sample
  const firstSegment = transcriptSegments[0];
  const timestampEl = firstSegment.querySelector('.segment-timestamp');
  const textEl = firstSegment.querySelector('.segment-text');
  console.log(`   Sample: [${timestampEl?.textContent}] ${textEl?.textContent?.substring(0, 50)}...\n`);
}

// Test 3: Video metadata
console.log('📊 Test 3: Video Metadata');
const selectors = {
  title: [
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1 yt-formatted-string',
    'ytd-watch-metadata h1'
  ],
  channel: [
    'ytd-channel-name#channel-name yt-formatted-string a',
    'ytd-channel-name a'
  ]
};

let videoTitle = null;
for (const selector of selectors.title) {
  const el = document.querySelector(selector);
  if (el?.textContent?.trim()) {
    videoTitle = el.textContent.trim();
    break;
  }
}

let channelTitle = null;
for (const selector of selectors.channel) {
  const el = document.querySelector(selector);
  if (el?.textContent?.trim()) {
    channelTitle = el.textContent.trim();
    break;
  }
}

console.log(`   Title: ${videoTitle ? `✅ "${videoTitle}"` : '❌ NOT FOUND'}`);
console.log(`   Channel: ${channelTitle ? `✅ "${channelTitle}"` : '❌ NOT FOUND'}\n`);

// Test 4: Backend connectivity
console.log('🌐 Test 4: Backend Connection');
fetch('http://localhost:8000/health')
  .then(response => response.json())
  .then(data => {
    console.log(`   Backend: ✅ ONLINE`);
    console.log(`   Status: ${data.status || 'healthy'}\n`);
    
    // Test 5: Check if transcript is cached
    if (videoId) {
      return fetch(`http://localhost:8000/api/transcripts/check/${videoId}`)
        .then(r => r.json())
        .then(result => {
          console.log('📦 Test 5: Transcript Cache');
          console.log(`   Cached: ${result.cached ? '✅ YES' : '❌ NO'}`);
          if (result.cached) {
            console.log(`   S3 Key: ${result.s3Key || 'N/A'}\n`);
          }
        });
    }
  })
  .catch(error => {
    console.error('   Backend: ❌ OFFLINE');
    console.error('   Error:', error.message);
    console.error('   ');
    console.error('   SOLUTION:');
    console.error('   1. Open Terminal');
    console.error('   2. cd python_backend');
    console.error('   3. python start_server.py');
    console.error('   4. Wait for "Uvicorn running on http://0.0.0.0:8000"');
    console.error('   5. Run this test script again\n');
  });

// Test 6: Extension loaded check
console.log('🔌 Test 6: Extension Check');
setTimeout(() => {
  const extensionButton = document.getElementById('streamsmart-extract-btn');
  if (extensionButton) {
    console.log('   Extension: ✅ LOADED');
    console.log('   Button: ✅ VISIBLE');
  } else {
    console.warn('   Extension: ❌ NOT LOADED');
    console.warn('   ');
    console.warn('   SOLUTION:');
    console.warn('   1. Go to chrome://extensions/');
    console.warn('   2. Find "StreamSmart Transcript Extractor"');
    console.warn('   3. Toggle OFF then ON');
    console.warn('   4. Reload this YouTube page');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60) + '\n');
  
  // Summary
  const allGood = isYouTube && isWatchPage && videoId && transcriptSegments.length > 0 && videoTitle && channelTitle;
  
  if (allGood) {
    console.log('✅ ALL SYSTEMS GO! Ready to extract transcript.');
    console.log('👉 Click the "Send to StreamSmart" button below the video.');
  } else {
    console.log('⚠️  ISSUES DETECTED - See warnings above');
    console.log('');
    console.log('Quick Checklist:');
    console.log(`   ${isYouTube && isWatchPage ? '✅' : '❌'} On YouTube watch page`);
    console.log(`   ${videoId ? '✅' : '❌'} Valid video ID`);
    console.log(`   ${transcriptSegments.length > 0 ? '✅' : '❌'} Transcript panel open`);
    console.log(`   ${videoTitle ? '✅' : '❌'} Video title found`);
    console.log(`   ${channelTitle ? '✅' : '❌'} Channel name found`);
  }
}, 1000);
