/**
 * YouTube Transcript Scraper - Content Script
 * Runs on YouTube watch pages to extract transcripts
 */

console.log('🎬 StreamSmart: YouTube scraper loaded');

// Configuration
const CONFIG = {
  BACKEND_URL: 'https://ppbmdfvxrc.ap-south-1.awsapprunner.com',
  BUTTON_ID: 'streamsmart-extract-btn',
  STATUS_ID: 'streamsmart-status'
};

// State
let currentVideoId = null;
let extractionInProgress = false;

/**
 * Get the current YouTube video ID from the page
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Get video title from the page
 */
function getVideoTitle() {
  // Try multiple selectors
  const selectors = [
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1.ytd-video-primary-info-renderer yt-formatted-string',
    'h1 yt-formatted-string.ytd-watch-metadata',
    'h1.title.ytd-video-primary-info-renderer yt-formatted-string',
    'ytd-watch-metadata h1',
    'meta[name="title"]',
    'meta[property="og:title"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.getAttribute ? 
                    (element.getAttribute('content') || element.textContent) : 
                    element.textContent;
      
      if (title && title.trim().length > 0) {
        return title.trim();
      }
    }
  }
  
  // Fallback: try to get from page title
  const pageTitle = document.title;
  if (pageTitle && !pageTitle.includes('YouTube')) {
    return pageTitle.replace(' - YouTube', '').trim();
  }
  
  return 'Unknown Video';
}

/**
 * Get channel title
 */
function getChannelTitle() {
  const selectors = [
    'ytd-channel-name#channel-name yt-formatted-string a',
    'ytd-channel-name yt-formatted-string a',
    'ytd-video-owner-renderer ytd-channel-name a',
    'meta[itemprop="author"]',
    'meta[property="og:video:tag"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const channel = element.getAttribute ? 
                      (element.getAttribute('content') || element.textContent) : 
                      element.textContent;
      
      if (channel && channel.trim().length > 0) {
        return channel.trim();
      }
    }
  }
  
  return 'Unknown Channel';
}

/**
 * Get video duration from page
 */
function getVideoDuration() {
  try {
    // Try to get from video player
    const video = document.querySelector('video');
    if (video && video.duration) {
      const totalSeconds = Math.floor(video.duration);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      } else {
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
      }
    }
    
    // Fallback: try to get from time display
    const timeDisplay = document.querySelector('.ytp-time-duration');
    if (timeDisplay) {
      return timeDisplay.textContent.trim();
    }
    
    return '0:00';
  } catch (error) {
    console.error('Error getting video duration:', error);
    return '0:00';
  }
}

/**
 * Get user ID - prompts user to authenticate if not set
 * Production-ready: requires explicit user authentication
 */
async function getUserId() {
  try {
    // Check if userId is already stored
    const result = await chrome.storage.sync.get('userId');
    if (result.userId && result.userId !== 'demo-user-id') {
      return result.userId;
    }
    
    // If not set, prompt user to authenticate
    console.warn('⚠️ User ID not configured. Prompting for authentication...');
    
    // Show message to user
    const shouldAuthenticate = confirm(
      '🔐 StreamSmart Extension Authentication Required\n\n' +
      'To sync videos with your account, you need to authenticate.\n\n' +
      'Click OK to open the authentication page.\n' +
      'Click Cancel to continue with demo account (videos won\'t sync to your playlists).'
    );
    
    if (shouldAuthenticate) {
      // Open authentication page (redirect to playlists)
      window.open('https://main.de7gjtsqdtkvr.amplifyapp.com/playlists', '_blank');
      
      // Wait for user to complete authentication
      showStatus('⏳ Waiting for authentication... Log in at the new tab.', 'info', false);
      
      // Poll for userId (user will set it from the auth page)
      return await waitForAuthentication();
    } else {
      // User declined, use demo account
      console.log('User chose to continue with demo account');
      return 'demo-user-id';
    }
    
  } catch (error) {
    console.error('Error getting user ID:', error);
    return 'demo-user-id';
  }
}

/**
 * Wait for user to complete authentication in the opened tab
 * Polls chrome.storage for userId update
 */
async function waitForAuthentication(maxWaitTime = 120000) {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds
  
  return new Promise((resolve) => {
    const checkAuth = setInterval(async () => {
      const result = await chrome.storage.sync.get('userId');
      
      if (result.userId && result.userId !== 'demo-user-id') {
        clearInterval(checkAuth);
        showStatus('✅ Authentication successful!', 'success');
        resolve(result.userId);
      } else if (Date.now() - startTime > maxWaitTime) {
        // Timeout after 2 minutes
        clearInterval(checkAuth);
        showStatus('⏱️ Authentication timeout. Using demo account.', 'warning');
        resolve('demo-user-id');
      }
    }, pollInterval);
  });
}

/**
 * Add video to user's playlist
 */
async function addToPlaylist(data) {
  try {
    const userId = await getUserId();
    console.log('👤 Using User ID:', userId);
    
    const payload = {
      userId: userId,
      videoData: {
        youtubeId: data.videoId,
        title: data.videoTitle,
        channelTitle: data.channelTitle,
        thumbnail: data.thumbnail,
        duration: data.duration,
        url: `https://www.youtube.com/watch?v=${data.videoId}`,
        description: ''
      },
      transcriptData: {
        s3Key: data.transcriptS3Key,
        language: data.language || 'en',
        segmentCount: data.segmentCount,
        uploadedAt: data.uploadedAt || new Date().toISOString()
      }
    };
    
    console.log('📤 Adding to playlist:', payload);
    
    const response = await fetch(`https://main.de7gjtsqdtkvr.amplifyapp.com/api/playlists/add-from-extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📡 API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Playlist add result:', result);
    console.log('✅ Full playlist result (stringified):', JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('❌ Playlist add failed:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Queue failed playlist additions for retry
 */
async function queueForRetry(data) {
  try {
    const result = await chrome.storage.local.get('retryQueue');
    const queue = result.retryQueue || [];
    
    queue.push({
      timestamp: Date.now(),
      attempts: 0,
      data: data
    });
    
    // Keep only last 20 items
    const trimmedQueue = queue.slice(-20);
    
    await chrome.storage.local.set({ retryQueue: trimmedQueue });
    
    console.log('📝 Queued for retry:', data.videoId);
  } catch (error) {
    console.error('Error queuing for retry:', error);
  }
}

/**
 * Extract transcript from YouTube's transcript panel (DOM scraping)
 */
async function extractTranscriptFromDOM() {
  console.log('📝 Attempting to extract transcript from DOM...');
  
  // Wait for transcript panel to be available
  const maxAttempts = 10;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    
    if (segments.length > 0) {
      console.log(`✅ Found ${segments.length} transcript segments`);
      
      const totalSegments = segments.length;
      const transcript = [];
      
      // Process segments with progress updates
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const timestampEl = segment.querySelector('.segment-timestamp');
        const textEl = segment.querySelector('.segment-text');
        
        const timestamp = timestampEl ? timestampEl.textContent.trim() : '0:00';
        const text = textEl ? textEl.textContent.trim() : '';
        
        if (text.trim().length > 0) {
          transcript.push({
            timestamp: timestamp || '0:00',
            text: text || ' '
          });
        }
        
        // Update progress every 10 segments or on last segment
        if ((i + 1) % 10 === 0 || i === segments.length - 1) {
          updateProgress('Extracting transcript...', i + 1, totalSegments, 'info');
        }
      }
      
      // Show completion
      showStatus(`✅ Extracted ${transcript.length} segments`, 'success');
      
      return transcript;
    }
    
    // Show waiting progress
    updateProgress('Waiting for transcript...', attempts + 1, maxAttempts, 'info');
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  console.warn('⚠️ Could not find transcript segments in DOM');
  return null;
}

/**
 * Check if video is already in user's playlists
 */
async function checkTranscriptCached(videoId) {
  try {
    // Get user ID
    const userId = await getUserId();
    if (!userId) {
      return false;
    }

    // Check if video exists in any of user's playlists
    const response = await fetch(`https://main.de7gjtsqdtkvr.amplifyapp.com/api/playlists/check-video?userId=${userId}&videoId=${videoId}`);
    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
  } catch (error) {
    console.error('Error checking video in playlists:', error);
  }
  return false;
}

/**
 * Send transcript to StreamSmart backend
 */
async function sendToBackend(videoId, videoTitle, channelTitle, segments) {
  try {
    console.log(`📤 Uploading transcript to backend: ${segments.length} segments`);
    
    const payload = {
      videoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: videoTitle,
      segments: segments,
      language: 'en',
      userId: 'extension_user',
      channelTitle: channelTitle
    };
    
    console.log('📦 Payload summary:', {
      videoId: payload.videoId,
      title: payload.title,
      segmentCount: payload.segments.length,
      firstSegment: payload.segments[0],
      lastSegment: payload.segments[payload.segments.length - 1]
    });
    console.log('📦 Full payload:', JSON.stringify(payload, null, 2));
    
    // Show upload progress
    showStatus('Uploading to backend...', 'info', false, { progress: 50, progressText: 'Uploading...' });
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transcripts/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    // Show S3 upload progress
    showStatus('Uploading to S3...', 'info', false, { progress: 75, progressText: 'Uploading to S3...' });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('❌ Backend error response:', errorData);
        console.error('❌ Backend error (stringified):', JSON.stringify(errorData, null, 2));
        errorMessage = JSON.stringify(errorData, null, 2);
      } catch (e) {
        const errorText = await response.text();
        console.error('❌ Backend error text:', errorText);
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('✅ Upload successful:', result);
    console.log('✅ S3 Key from upload:', result.s3Key);
    console.log('✅ Video ID from upload:', result.videoId);
    
    // Verify we have the S3 key
    if (!result.s3Key) {
      console.error('⚠️ Warning: No S3 key returned from backend!');
      console.error('⚠️ Full result:', JSON.stringify(result, null, 2));
    }
    
    // Show completion
    showStatus('Upload complete!', 'success', false, { progress: 100, progressText: 'Complete!' });
    
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Show status message to user with optional progress bar
 */
function showStatus(message, type = 'info', options = {}) {
  let statusEl = document.getElementById(CONFIG.STATUS_ID);
  
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = CONFIG.STATUS_ID;
    statusEl.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      max-width: 350px;
      min-width: 280px;
    `;
    document.body.appendChild(statusEl);
  }
  
  const colors = {
    info: { bg: '#2196F3', text: '#fff' },
    success: { bg: '#4CAF50', text: '#fff' },
    error: { bg: '#f44336', text: '#fff' },
    warning: { bg: '#ff9800', text: '#fff' }
  };
  
  const color = colors[type] || colors.info;
  statusEl.style.backgroundColor = color.bg;
  statusEl.style.color = color.text;
  statusEl.style.display = 'block';
  
  // Build content with progress bar if specified
  if (options.progress !== undefined) {
    const progressPercent = Math.min(100, Math.max(0, options.progress));
    const progressText = options.progressText || `${Math.round(progressPercent)}%`;
    
    statusEl.innerHTML = `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 600;">${message}</span>
          <span style="font-size: 12px; opacity: 0.9;">${progressText}</span>
        </div>
        <div style="width: 100%; height: 6px; background-color: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; background-color: rgba(255,255,255,0.9); border-radius: 3px; transition: width 0.3s ease; width: ${progressPercent}%;"></div>
        </div>
      </div>
    `;
  } else if (options.action && options.link) {
    statusEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <span>${message}</span>
        <a href="${options.link}" target="_blank" 
           style="color: white; text-decoration: underline; white-space: nowrap; font-weight: 600;">
          ${options.action} →
        </a>
      </div>
    `;
    
    // Auto-hide after 10 seconds (longer for action buttons)
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 10000);
  } else {
    statusEl.textContent = message;
    
    // Auto-hide after 5 seconds (unless progress is ongoing)
    if (!options.keepAlive) {
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 5000);
    }
  }
}

/**
 * Update progress bar in status display
 */
function updateProgress(message, current, total, type = 'info') {
  const percent = total > 0 ? (current / total) * 100 : 0;
  const progressText = `${current}/${total}`;
  
  showStatus(message, type, {
    progress: percent,
    progressText: progressText,
    keepAlive: true
  });
}

/**
 * Main extraction handler
 */
async function handleExtraction() {
  if (extractionInProgress) {
    showStatus('⏳ Extraction already in progress...', 'warning');
    return;
  }
  
  extractionInProgress = true;
  const videoId = getVideoId();
  
  if (!videoId) {
    showStatus('❌ Could not detect video ID', 'error');
    extractionInProgress = false;
    return;
  }
  
  try {
    showStatus('🔍 Checking if transcript is cached...', 'info');
    
    // Check if already cached
    const isCached = await checkTranscriptCached(videoId);
    
    if (isCached) {
      showStatus('✅ Transcript already in StreamSmart!', 'success');
      extractionInProgress = false;
      return;
    }
    
    showStatus('📝 Extracting transcript from video...', 'info');
    
    // Extract transcript
    const segments = await extractTranscriptFromDOM();
    
    if (!segments || segments.length === 0) {
      showStatus('❌ No transcript found. Enable captions on YouTube!', 'error');
      extractionInProgress = false;
      return;
    }
    
    const videoTitle = getVideoTitle();
    const channelTitle = getChannelTitle();
    
    console.log('📊 Extracted metadata:', { videoId, videoTitle, channelTitle });
    
    showStatus(`📤 Uploading ${segments.length} segments to StreamSmart...`, 'info');
    
    // Upload to backend
    const result = await sendToBackend(videoId, videoTitle, channelTitle, segments);
    
    if (!result.success) {
      throw new Error(result.message || 'Upload failed');
    }
    
    console.log('✅ Transcript uploaded successfully:', result);
    
    // Verify S3 key before adding to playlist
    if (!result.s3Key) {
      throw new Error('Transcript uploaded but no S3 key returned. Cannot add to playlist.');
    }
    
    console.log('📋 Preparing to add to playlist with S3 key:', result.s3Key);
    
    // NEW: Add video to playlist
    showStatus('📋 Adding to your StreamSmart playlist...', 'info', false, { progress: 90, progressText: 'Adding to playlist...' });
    
    const playlistResult = await addToPlaylist({
      videoId,
      videoTitle,
      channelTitle,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: getVideoDuration(),
      transcriptS3Key: result.s3Key,
      language: 'en',
      segmentCount: segments.length,
      uploadedAt: new Date().toISOString()
    });
    
    console.log('📋 Playlist add result:', playlistResult);
    
    if (playlistResult.success) {
      if (playlistResult.isDuplicate) {
        showStatus('✅ Video already in StreamSmart!', 'success');
      } else {
        showStatus('✅ Successfully added! Redirecting to StreamSmart...', 'success');
        
        // Auto-redirect to playlists after 2 seconds
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'openInStreamSmart', videoId }, (response) => {
            if (!response || !response.success) {
              // Fallback: open link directly
              window.open(`https://main.de7gjtsqdtkvr.amplifyapp.com/playlists/${playlistResult.playlistId}`, '_blank');
            }
          });
        }, 2000);
      }
      
      // Update button state
      updateButtonState('cached');
    } else {
      // Transcript uploaded but playlist add failed - not critical
      console.warn('⚠️ Playlist add failed:', playlistResult.error);
      showStatus('⚠️ Transcript saved, playlist sync pending', 'warning');
      
      // Queue for retry
      queueForRetry({
        videoId,
        videoTitle,
        channelTitle,
        transcriptS3Key: result.s3Key,
        segmentCount: segments.length
      });
    }
    
  } catch (error) {
    console.error('Error during extraction:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  } finally {
    extractionInProgress = false;
  }
}

/**
 * Create and inject the extraction button
 */
function injectButton() {
  // Remove existing button if any
  const existingButton = document.getElementById(CONFIG.BUTTON_ID);
  if (existingButton) {
    existingButton.remove();
  }
  
  // Find the container (below video, above description)
  const container = document.querySelector('#top-level-buttons-computed') ||
                    document.querySelector('ytd-menu-renderer.ytd-video-primary-info-renderer');
  
  if (!container) {
    console.warn('⚠️ Could not find button container');
    return;
  }
  
  // Create button
  const button = document.createElement('button');
  button.id = CONFIG.BUTTON_ID;
  button.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    Open in StreamSmart
  `;
  button.className = 'streamsmart-extract-button';
  button.onclick = handleExtraction;
  
  // Insert button
  container.appendChild(button);
  
  console.log('✅ Button injected');
  
  // Check if transcript is already cached
  const videoId = getVideoId();
  if (videoId) {
    checkTranscriptCached(videoId).then(isCached => {
      if (isCached) {
        updateButtonState('cached');
      }
    });
  }
}

/**
 * Update button appearance based on state
 */
function updateButtonState(state) {
  const button = document.getElementById(CONFIG.BUTTON_ID);
  if (!button) return;
  
  if (state === 'cached') {
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Already in StreamSmart
    `;
    button.style.backgroundColor = '#4CAF50';
    button.disabled = true;
  }
}

/**
 * Initialize when page loads
 */
function initialize() {
  console.log('🚀 Initializing StreamSmart extractor...');
  
  currentVideoId = getVideoId();
  
  if (currentVideoId) {
    // Wait for page to fully load
    setTimeout(() => {
      injectButton();
    }, 2000);
  }
}

/**
 * Handle navigation (YouTube SPA)
 */
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    const newVideoId = getVideoId();
    
    if (newVideoId && newVideoId !== currentVideoId) {
      currentVideoId = newVideoId;
      console.log('🔄 Video changed:', currentVideoId);
      
      setTimeout(() => {
        injectButton();
      }, 2000);
    }
  }
}).observe(document, { subtree: true, childList: true });

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTranscript') {
    handleExtraction().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});
