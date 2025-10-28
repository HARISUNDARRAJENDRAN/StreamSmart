/**
 * Popup Script
 * Handles popup UI interactions
 */

const CONFIG = {
  BACKEND_URL: 'http://localhost:8000'
};

// Elements
let extractBtn;
let currentVideoSection;
let notYoutubeSection;
let videoTitle;
let videoChannel;
let recentList;
let backendStatus;

// State
let currentTab = null;

/**
 * Initialize popup
 */
async function init() {
  // Get DOM elements
  extractBtn = document.getElementById('extractBtn');
  currentVideoSection = document.getElementById('currentVideoSection');
  notYoutubeSection = document.getElementById('notYoutubeSection');
  videoTitle = document.getElementById('videoTitle');
  videoChannel = document.getElementById('videoChannel');
  recentList = document.getElementById('recentList');
  backendStatus = document.getElementById('backendStatus');
  
  // Add event listeners
  extractBtn.addEventListener('click', handleExtract);
  
  // Check backend status
  await checkBackendStatus();
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  
  // Check if on YouTube
  if (tab.url && tab.url.includes('youtube.com/watch')) {
    await loadCurrentVideo(tab);
  } else {
    showNotYouTube();
  }
  
  // Load recent extractions
  await loadRecentExtractions();
}

/**
 * Check backend health
 */
async function checkBackendStatus() {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/health`, { signal: AbortSignal.timeout(5000) });
    
    if (response.ok) {
      backendStatus.classList.add('online');
      backendStatus.querySelector('.text').textContent = 'Online';
    } else {
      backendStatus.classList.add('offline');
      backendStatus.querySelector('.text').textContent = 'Offline';
    }
  } catch (error) {
    backendStatus.classList.add('offline');
    backendStatus.querySelector('.text').textContent = 'Offline';
  }
}

/**
 * Load current video info
 */
async function loadCurrentVideo(tab) {
  currentVideoSection.style.display = 'block';
  notYoutubeSection.style.display = 'none';
  
  try {
    // Get video ID from URL
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      showNotYouTube();
      return;
    }
    
    // Get video title from page title
    const title = tab.title.replace(' - YouTube', '');
    videoTitle.textContent = title;
    
    // Check if already cached
    const response = await chrome.runtime.sendMessage({
      action: 'checkCached',
      videoId: videoId
    });
    
    if (response.cached) {
      extractBtn.textContent = '✓ Already in StreamSmart';
      extractBtn.classList.remove('btn-primary');
      extractBtn.classList.add('btn-success');
      extractBtn.disabled = true;
    }
    
  } catch (error) {
    console.error('Error loading video:', error);
    videoTitle.textContent = 'Error loading video';
  }
}

/**
 * Show not on YouTube message
 */
function showNotYouTube() {
  currentVideoSection.style.display = 'none';
  notYoutubeSection.style.display = 'block';
}

/**
 * Handle extract button click
 */
async function handleExtract() {
  if (!currentTab) return;
  
  extractBtn.disabled = true;
  extractBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M16 12l-4-4-4 4M12 16V8"></path>
    </svg>
    Extracting...
  `;
  
  try {
    // Send message to content script
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'extractTranscript'
    });
    
    if (response.success) {
      extractBtn.innerHTML = '✓ Successfully Added';
      extractBtn.classList.remove('btn-primary');
      extractBtn.classList.add('btn-success');
      
      // Reload recent extractions
      await loadRecentExtractions();
      
      // Keep success state
      setTimeout(() => {
        extractBtn.disabled = true;
      }, 100);
    } else {
      throw new Error(response.error || 'Extraction failed');
    }
  } catch (error) {
    console.error('Extract error:', error);
    extractBtn.innerHTML = '❌ Failed - Try Again';
    extractBtn.disabled = false;
    
    setTimeout(() => {
      extractBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Extract Transcript
      `;
    }, 3000);
  }
}

/**
 * Load recent extractions
 */
async function loadRecentExtractions() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getRecentUploads'
    });
    
    if (response.uploads && response.uploads.length > 0) {
      recentList.innerHTML = response.uploads
        .map(upload => `
          <div class="recent-item">
            <div class="recent-item-title">${upload.title}</div>
            <div class="recent-item-time">${formatTime(upload.uploadedAt)}</div>
          </div>
        `)
        .join('');
    } else {
      recentList.innerHTML = '<p class="empty">No recent extractions</p>';
    }
  } catch (error) {
    console.error('Error loading recent:', error);
  }
}

/**
 * Format timestamp
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', init);
