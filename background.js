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
      previousUrls: [],
      openerTabId: tab.openerTabId || null
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
  },
  
  // Clean up when tabs are closed
  async onTabRemoved(tabId) {
    const history = await browser.storage.local.get('tabHistory');
    const tabHistory = history.tabHistory || {};
    delete tabHistory[tabId];
    await browser.storage.local.set({ tabHistory });
  }
};

// Initialize storage on extension startup
initializeStorage();

// Legacy tab metadata storage (now using persistent storage)
// const tabMetadata = new Map();

// Track when tabs are created
browser.tabs.onCreated.addListener(enhancedTabTracking.onTabCreated);

// Clean up when tabs are closed
browser.tabs.onRemoved.addListener(enhancedTabTracking.onTabRemoved);

// Track last access time for tabs
browser.tabs.onActivated.addListener(enhancedTabTracking.onTabActivated);

// Track tab deactivation for active time calculation
browser.tabs.onActivated.addListener(async (activeInfo) => {
  // When a tab is activated, deactivate the previous one
  const tabs = await browser.tabs.query({ active: false, currentWindow: true });
  tabs.forEach(tab => {
    if (tab.id !== activeInfo.tabId) {
      enhancedTabTracking.onTabDeactivated(tab.id);
    }
  });
});

// Track URL changes within tabs
browser.tabs.onUpdated.addListener(enhancedTabTracking.onTabUpdated);

// Listen for keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command === "save-tabs") {
    saveTabs();
  }
});

// Listen for messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveTabs") {
    saveTabs();
  }
});

async function saveTabs() {
  try {
    // Get user preference
    const prefs = await browser.storage.local.get('saveMethod');
    const saveMethod = prefs.saveMethod || 'editor';
    
    // Get all tabs in current window
    const tabs = await browser.tabs.query({ currentWindow: true });
    
    // Generate markdown content
    const markdown = await generateMarkdown(tabs);
    
    // Create filename with timestamp
    const now = new Date();
    const filename = `tabs_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.md`;
    
    switch (saveMethod) {
      case 'editor':
        // Open editor with the markdown content
        const editorUrl = browser.runtime.getURL('editor.html') + 
          '?content=' + encodeURIComponent(markdown) + 
          '&filename=' + encodeURIComponent(filename);
        
        browser.tabs.create({
          url: editorUrl,
          active: true
        });
        break;
        
      case 'direct':
        // Direct download
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        await browser.downloads.download({
          url: url,
          filename: filename,
          saveAs: false
        });
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        break;
        
      case 'clipboard':
        // Copy to clipboard - need to do this in active tab
        const code = `
          navigator.clipboard.writeText(${JSON.stringify(markdown)}).then(() => {
            alert('Tab list copied to clipboard!');
          }).catch(() => {
            // Fallback: copy to clipboard using older method
            const textarea = document.createElement('textarea');
            textarea.value = ${JSON.stringify(markdown)};
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Tab list copied to clipboard!');
          });
        `;
        
        // Get active tab and inject script
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        browser.tabs.executeScript(activeTab.id, {
          code: code
        });
        break;
    }
    
  } catch (error) {
    console.error('Error saving tabs:', error);
  }
}

async function generateMarkdown(tabs) {
  const history = await browser.storage.local.get('tabHistory');
  const tabHistory = history.tabHistory || {};
  const lines = [];
  const processed = new Set();
  
  // Header
  lines.push(`# Saved Tabs - ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push(`**Total tabs:** ${tabs.length}`);
  lines.push(`**Window:** Current window`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Build parent-child relationships
  const childrenMap = new Map();
  tabs.forEach(tab => {
    const tabData = tabHistory[tab.id] || {};
    const parentId = tabData.openerTabId;
    
    if (parentId && tabs.some(t => t.id === parentId)) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId).push(tab.id);
    }
  });
  
  // Process tabs in order
  function processTab(tab, level = 0) {
    if (processed.has(tab.id)) return;
    processed.add(tab.id);
    
    const indent = '  '.repeat(level);
    const tabData = tabHistory[tab.id] || {};
    
    // Tab number (position)
    const tabNum = tab.index + 1;
    
    // Status indicators
    const status = [];
    if (tab.active) status.push('ACTIVE');
    if (tab.pinned) status.push('PINNED');
    if (tab.audible) status.push('🔊');
    if (tab.mutedInfo && tab.mutedInfo.muted) status.push('🔇');
    
    // Main tab entry with position number
    const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : '';
    lines.push(`${indent}${tabNum}. [${tab.title || 'Untitled'}](${tab.url})${statusStr}`);
    
    // Add enhanced metadata
    if (tabData.firstOpened) {
      const firstOpened = new Date(tabData.firstOpened);
      lines.push(`${indent}   - First opened: ${firstOpened.toLocaleDateString()} ${firstOpened.toLocaleTimeString()}`);
    }
    
    if (tabData.accessCount) {
      lines.push(`${indent}   - Times accessed: ${tabData.accessCount}`);
    }
    
    if (tabData.totalActiveTime) {
      const minutes = Math.floor(tabData.totalActiveTime / 60000);
      const seconds = Math.floor((tabData.totalActiveTime % 60000) / 1000);
      lines.push(`${indent}   - Total active time: ${minutes}m ${seconds}s`);
    }
    
    if (tabData.previousUrls && tabData.previousUrls.length > 0) {
      lines.push(`${indent}   - URL history: ${tabData.previousUrls.length} previous URLs`);
      tabData.previousUrls.slice(-3).forEach(prev => {
        const prevTime = new Date(prev.timestamp);
        lines.push(`${indent}     • ${prev.url} (${prevTime.toLocaleTimeString()})`);
      });
    }
    
    // Add container info if using containers
    if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
      lines.push(`${indent}   - Container: ${tab.cookieStoreId}`);
    }
    
    // Add automatic Notes section for annotation
    lines.push(`${indent}   - Notes: `);
    
    // Process children immediately after parent
    const children = childrenMap.get(tab.id) || [];
    children.forEach(childId => {
      const childTab = tabs.find(t => t.id === childId);
      if (childTab) {
        lines.push(`${indent}   ↳ Child tab:`);
        processTab(childTab, level + 1);
      }
    });
  }
  
  // Process all tabs in their original order
  tabs.forEach(tab => {
    processTab(tab);
    if (!childrenMap.has(tab.id) || childrenMap.get(tab.id).length === 0) {
      lines.push(''); // Add spacing between top-level tabs
    }
  });
  
  // Add enhanced statistics at the end
  lines.push('---');
  lines.push('');
  lines.push('## Statistics');
  lines.push(`- Total tabs: ${tabs.length}`);
  lines.push(`- Pinned tabs: ${tabs.filter(t => t.pinned).length}`);
  lines.push(`- Tabs with audio: ${tabs.filter(t => t.audible).length}`);
  lines.push(`- Active tab: Tab ${tabs.findIndex(t => t.active) + 1}`);
  
  // Add time-based statistics
  let totalActiveTime = 0;
  let totalAccessCount = 0;
  let tabsWithHistory = 0;
  
  tabs.forEach(tab => {
    const tabData = tabHistory[tab.id] || {};
    if (tabData.totalActiveTime) totalActiveTime += tabData.totalActiveTime;
    if (tabData.accessCount) totalAccessCount += tabData.accessCount;
    if (tabData.previousUrls && tabData.previousUrls.length > 0) tabsWithHistory++;
  });
  
  if (totalActiveTime > 0) {
    const minutes = Math.floor(totalActiveTime / 60000);
    const seconds = Math.floor((totalActiveTime % 60000) / 1000);
    lines.push(`- Total active time: ${minutes}m ${seconds}s`);
  }
  
  if (totalAccessCount > 0) {
    lines.push(`- Total access count: ${totalAccessCount}`);
  }
  
  if (tabsWithHistory > 0) {
    lines.push(`- Tabs with navigation history: ${tabsWithHistory}`);
  }
  
  return lines.join('\n');
}