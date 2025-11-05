/**
 * Web App Auth Sync Content Script
 * Automatically syncs authentication from web app to extension
 * Injected into StreamSmart web app pages
 */

console.log('🔐 StreamSmart: Auth sync script loaded');

/**
 * Sync authentication from localStorage to extension storage
 */
function syncAuthToExtension() {
  try {
    const token = localStorage.getItem('streamsmart_extension_token');
    const userId = localStorage.getItem('streamsmart_user_id');
    
    if (token && userId) {
      console.log('✅ Found auth credentials, syncing to extension');
      
      // Send to background script
      chrome.runtime.sendMessage({
        action: 'setAuth',
        token,
        userId
      }, (response) => {
        if (response && response.success) {
          console.log('✅ Auth synced to extension successfully');
        } else {
          console.error('❌ Failed to sync auth to extension');
        }
      });
    } else {
      console.log('ℹ️ No auth credentials found in localStorage');
    }
  } catch (error) {
    console.error('Failed to sync auth:', error);
  }
}

/**
 * Listen for custom events from the web app
 */
window.addEventListener('streamsmart-token-ready', (event) => {
  console.log('📡 Token ready event received');
  syncAuthToExtension();
});

/**
 * Listen for localStorage changes
 */
window.addEventListener('storage', (event) => {
  if (event.key === 'streamsmart_extension_token' || event.key === 'streamsmart_user_id') {
    console.log('📡 Auth credential changed in localStorage');
    syncAuthToExtension();
  }
});

/**
 * Initial sync on page load
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncAuthToExtension);
} else {
  // DOMContentLoaded already fired
  syncAuthToExtension();
}

/**
 * Periodic sync (every 30 seconds) to catch any missed updates
 */
setInterval(syncAuthToExtension, 30000);
