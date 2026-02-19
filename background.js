// Background service worker
console.log('🚀 Rocket Math Bot service worker loaded!! yay :D');

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isRunning: false });
});

// Forward messages between popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    return true;
});
