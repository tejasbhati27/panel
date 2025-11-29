declare const chrome: any;

// Listen for keyboard shortcut triggers
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'toggle-dashboard') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_DASHBOARD' });
      }
    });
  }
});

// Listen for messages from the content script
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response?: any) => void) => {
  if (request.type === 'CLEAR_DATA') {
    // 24 hours * 60 min * 60 sec * 1000 ms
    const timeFrame = (new Date()).getTime() - (24 * 3600 * 1000);
    
    chrome.browsingData.remove(
      {
        "since": timeFrame
      },
      {
        "appcache": true,
        "cache": true,
        "cacheStorage": true,
        "cookies": false,
        "downloads": true,
        "fileSystems": true,
        "formData": true,
        "history": true,
        "indexedDB": true,
        "localStorage": true,
        "passwords": true,
        "serviceWorkers": true,
        "webSQL": true
      },
      () => {
        sendResponse({ success: true });
      }
    );
    // Return true to indicate we wish to send a response asynchronously
    return true; 
  }
});