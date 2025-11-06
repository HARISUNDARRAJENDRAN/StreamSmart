/**
 * Background Service Worker
 * Handles API communication and storage
 */

console.log('🔧 StreamSmart: Service worker initialized');

const CONFIG = {
  BACKEND_URL: 'https://ppbmdfvxrc.ap-south-1.awsapprunner.com',
  FRONTEND_URL: 'https://main.de7gjtsqdtkvr.amplifyapp.com',
  STORAGE_KEYS: {
    USER_TOKEN: 'userToken',
    USER_ID: 'userId',
    RECENT_UPLOADS: 'recentUploads',
    SETTINGS: 'settings'
  }
};

/**
 * Auto-sync authentication from web app
 * Listens for token updates from localStorage
 */
async function syncAuthFromWebApp() {
  try {
    // Get token from chrome.storage (set by web app via content script)
    const { userToken, userId } = await chrome.storage.sync.get([
      CONFIG.STORAGE_KEYS.USER_TOKEN,
      CONFIG.STORAGE_KEYS.USER_ID
    ]);
    
    if (userToken && userId) {
      console.log('✅ User authenticated:', userId);
      return { token: userToken, userId };
    }
    
    console.log('⚠️ No authentication found');
    return null;
  } catch (error) {
    console.error('Failed to sync auth:', error);
    return null;
  }
}

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
      
    case 'setAuth':
      // Set authentication from web app
      chrome.storage.sync.set({
        [CONFIG.STORAGE_KEYS.USER_TOKEN]: request.token,
        [CONFIG.STORAGE_KEYS.USER_ID]: request.userId
      })
        .then(() => {
          console.log('✅ Authentication set for user:', request.userId);
          sendResponse({ success: true });
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getAuth':
      // Get current authentication
      syncAuthFromWebApp()
        .then(auth => sendResponse({ success: true, auth }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'openInStreamSmart':
      // Open StreamSmart and redirect to playlists
      handleOpenInStreamSmart(request.videoId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Open video in StreamSmart and redirect to playlists
 */
async function handleOpenInStreamSmart(videoId) {
  try {
    const auth = await syncAuthFromWebApp();
    
    if (!auth || !auth.token) {
      // No auth - open login page
      chrome.tabs.create({ 
        url: `${CONFIG.FRONTEND_URL}/auth/login?redirect=/playlists` 
      });
      return;
    }
    
    // User is authenticated - redirect to playlists
    chrome.tabs.create({ 
      url: `${CONFIG.FRONTEND_URL}/playlists` 
    });
  } catch (error) {
    console.error('Failed to open in StreamSmart:', error);
    throw error;
  }
}

/**
 * Upload transcript to backend
 */
async function handleTranscriptUpload(data) {
  try {
    const auth = await syncAuthFromWebApp();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    if (auth && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transcripts/upload`, {
      method: 'POST',
      headers,
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
 * Check if video is in user's playlists
 */
async function checkTranscriptCached(videoId) {
  try {
    // Get user ID
    const result = await chrome.storage.sync.get(['userId']);
    const userId = result.userId;
    
    if (!userId) {
      return false;
    }

    // Check if video exists in any of user's playlists
    const response = await fetch(`https://main.de7gjtsqdtkvr.amplifyapp.com/api/playlists/check-video?userId=${userId}&videoId=${videoId}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.exists;
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


