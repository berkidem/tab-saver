// ADVANCED FEATURES - Add this to background.js for persistent tab tracking

// Initialize storage for persistent tab data
async function initializeStorage() {
  const stored = await browser.storage.local.get('tabHistory');
  if (!stored.tabHistory) {
    await browser.storage.local.set({ tabHistory: {} });
  }
}

// Enhanced tab tracking with persistent storage
const enhancedTabTracking = {
  // Track when tab is first created
  async onTabCreated(tab) {
    const history = await browser.storage.local.get('tabHistory');
    const tabHistory = history.tabHistory || {};
    
    tabHistory[tab.id] = {
      firstOpened: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      totalActiveTime: 0,
      accessCount: 1,
      url: tab.url,
      title: tab.title,
      previousUrls: []
    };
    
    await browser.storage.local.set({ tabHistory });
  },
  
  // Track tab activation
  async onTabActivated(activeInfo) {
    const history = await browser.storage.local.get('tabHistory');
    const tabHistory = history.tabHistory || {};
    const tabData = tabHistory[activeInfo.tabId] || {};
    
    tabData.lastAccessed = new Date().toISOString();
    tabData.accessCount = (tabData.accessCount || 0) + 1;
    tabData.lastActivatedTime = Date.now();
    
    tabHistory[activeInfo.tabId] = tabData;
    await browser.storage.local.set({ tabHistory });
  },
  
  // Track when tab loses focus (to calculate active time)
  async onTabDeactivated(tabId) {
    const history = await browser.storage.local.get('tabHistory');
    const tabHistory = history.tabHistory || {};
    const tabData = tabHistory[tabId];
    
    if (tabData && tabData.lastActivatedTime) {
      const activeTime = Date.now() - tabData.lastActivatedTime;
      tabData.totalActiveTime = (tabData.totalActiveTime || 0) + activeTime;
      delete tabData.lastActivatedTime;
      
      tabHistory[tabId] = tabData;
      await browser.storage.local.set({ tabHistory });
    }
  },
  
  // Track URL changes within same tab
  async onTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      const history = await browser.storage.local.get('tabHistory');
      const tabHistory = history.tabHistory || {};
      const tabData = tabHistory[tabId] || {};
      
      if (tabData.url && tabData.url !== changeInfo.url) {
        tabData.previousUrls = tabData.previousUrls || [];
        tabData.previousUrls.push({
          url: tabData.url,
          timestamp: new Date().toISOString()
        });
      }
      
      tabData.url = changeInfo.url;
      tabData.title = tab.title || tabData.title;
      
      tabHistory[tabId] = tabData;
      await browser.storage.local.set({ tabHistory });
    }
  }
};

// Add to manifest.json permissions:
// "storage"

// Enhanced markdown generation with statistics
async function generateEnhancedMarkdown(tabs) {
  const history = await browser.storage.local.get('tabHistory');
  const tabHistory = history.tabHistory || {};
  const lines = [];
  
  tabs.forEach((tab, index) => {
    const tabData = tabHistory[tab.id] || {};
    lines.push(`${index + 1}. [${tab.title}](${tab.url})`);
    
    // Rich statistics
    if (tabData.firstOpened) {
      const firstOpened = new Date(tabData.firstOpened);
      lines.push(`   - First opened: ${firstOpened.toLocaleString()}`);
    }
    
    if (tabData.accessCount) {
      lines.push(`   - Times accessed: ${tabData.accessCount}`);
    }
    
    if (tabData.totalActiveTime) {
      const minutes = Math.floor(tabData.totalActiveTime / 60000);
      const seconds = Math.floor((tabData.totalActiveTime % 60000) / 1000);
      lines.push(`   - Total active time: ${minutes}m ${seconds}s`);
    }
    
    if (tabData.previousUrls && tabData.previousUrls.length > 0) {
      lines.push(`   - URL history: ${tabData.previousUrls.length} previous URLs`);
      tabData.previousUrls.slice(-3).forEach(prev => {
        lines.push(`     • ${prev.url} (${new Date(prev.timestamp).toLocaleTimeString()})`);
      });
    }
    
    lines.push('');
  });
  
  return lines.join('\n');
}

// To implement:
// 1. Add initializeStorage() call when extension loads
// 2. Replace existing event listeners with enhanced versions
// 3. Add "storage" to manifest.json permissions
// 4. Update generateMarkdown to use persistent data

// Other easy features to add:
// - Bookmark status (check if URL is bookmarked)
// - Screenshot thumbnails (using tabs.captureVisibleTab)
// - Group tabs by time periods (morning/afternoon/evening)
// - Export to different formats (JSON, CSV)
// - Search history to see if tab was visited before
// - Memory usage per tab (if available)
// - Container/context information