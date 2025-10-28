/**
 * Background Service Worker
 * Handles API communication and storage
 */

console.log('🔧 StreamSmart: Service worker initialized');

const CONFIG = {
  BACKEND_URL: 'http://localhost:8000',
  STORAGE_KEYS: {
    USER_TOKEN: 'userToken',
    RECENT_UPLOADS: 'recentUploads',
    SETTINGS: 'settings'
  }
};

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  switch (request.action) {
    case 'uploadTranscript':
      handleTranscriptUpload(request.data)
        .then(response => sendResponse({ success: true, response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'checkCached':
      checkTranscriptCached(request.videoId)
        .then(cached => sendResponse({ cached }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'getRecentUploads':
      getRecentUploads()
        .then(uploads => sendResponse({ uploads }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Upload transcript to backend
 */
async function handleTranscriptUpload(data) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transcripts/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    // Store in recent uploads
    if (result.success) {
      await addToRecentUploads({
        videoId: data.videoId,
        title: data.title,
        uploadedAt: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

/**
 * Check if transcript is cached
 */
async function checkTranscriptCached(videoId) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transcripts/check/${videoId}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.cached;
    }
    
    return false;
  } catch (error) {
    console.error('Check failed:', error);
    return false;
  }
}

/**
 * Add to recent uploads history
 */
async function addToRecentUploads(upload) {
  try {
    const { recentUploads = [] } = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.RECENT_UPLOADS);
    
    // Add to beginning, limit to 20
    const updated = [upload, ...recentUploads.filter(u => u.videoId !== upload.videoId)].slice(0, 20);
    
    await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.RECENT_UPLOADS]: updated });
  } catch (error) {
    console.error('Failed to store recent upload:', error);
  }
}

/**
 * Get recent uploads history
 */
async function getRecentUploads() {
  try {
    const { recentUploads = [] } = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.RECENT_UPLOADS);
    return recentUploads;
  } catch (error) {
    console.error('Failed to get recent uploads:', error);
    return [];
  }
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
  
  // If on YouTube watch page, trigger extraction
  if (tab.url && tab.url.includes('youtube.com/watch')) {
    chrome.tabs.sendMessage(tab.id, { action: 'extractTranscript' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      }
    });
  }
});

/**
 * Handle installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('📦 Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      [CONFIG.STORAGE_KEYS.SETTINGS]: {
        autoExtract: false,
        notifications: true,
        backendUrl: CONFIG.BACKEND_URL
      }
    });
    
    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'https://streamsmart.app/extension-welcome' });
  }
});

/**
 * Health check
 */
async function checkBackendHealth() {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

// Periodic health check (every 5 minutes)
setInterval(() => {
  checkBackendHealth().then(healthy => {
    if (!healthy) {
      console.warn('⚠️ Backend appears to be offline');
    }
  });
}, 5 * 60 * 1000);
