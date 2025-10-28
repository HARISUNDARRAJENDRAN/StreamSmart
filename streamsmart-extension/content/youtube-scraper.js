/**
 * YouTube Transcript Scraper - Content Script
 * Runs on YouTube watch pages to extract transcripts
 */

console.log('🎬 StreamSmart: YouTube scraper loaded');

// Configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:8000',
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
      
      const transcript = Array.from(segments).map(segment => {
        const timestampEl = segment.querySelector('.segment-timestamp');
        const textEl = segment.querySelector('.segment-text');
        
        const timestamp = timestampEl ? timestampEl.textContent.trim() : '0:00';
        const text = textEl ? textEl.textContent.trim() : '';
        
        return {
          timestamp: timestamp || '0:00',  // Ensure never empty
          text: text || ' '  // Ensure never empty (use space if empty)
        };
      }).filter(seg => seg.text.trim().length > 0);  // Filter out empty segments
      
      return transcript;
    }
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  console.warn('⚠️ Could not find transcript segments in DOM');
  return null;
}

/**
 * Check if transcript is already cached in backend
 */
async function checkTranscriptCached(videoId) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transcripts/check/${videoId}`);
    if (response.ok) {
      const data = await response.json();
      return data.cached;
    }
  } catch (error) {
    console.error('Error checking transcript cache:', error);
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
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transcripts/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
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
    
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Show status message to user
 */
function showStatus(message, type = 'info') {
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
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
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
    
    if (result.success) {
      showStatus('✅ Successfully added to StreamSmart!', 'success');
      
      // Update button state
      updateButtonState('cached');
    } else {
      throw new Error(result.message || 'Upload failed');
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
    Send to StreamSmart
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
