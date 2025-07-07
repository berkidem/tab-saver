// Store tab metadata that we collect over time
const tabMetadata = new Map();

// Track when tabs are created
browser.tabs.onCreated.addListener((tab) => {
  tabMetadata.set(tab.id, {
    createdAt: new Date().toISOString(),
    openerTabId: tab.openerTabId || null
  });
});

// Clean up when tabs are closed
browser.tabs.onRemoved.addListener((tabId) => {
  tabMetadata.delete(tabId);
});

// Track last access time for tabs
browser.tabs.onActivated.addListener((activeInfo) => {
  const metadata = tabMetadata.get(activeInfo.tabId) || {};
  metadata.lastAccessed = new Date().toISOString();
  metadata.accessCount = (metadata.accessCount || 0) + 1;
  tabMetadata.set(activeInfo.tabId, metadata);
});

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
  } else if (request.action === "getMetadata") {
    // Request from content script for metadata
    getPageMetadata(sender.tab);
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
          });
        `;
        
        browser.tabs.executeScript({
          code: code
        });
        break;
    }
    
  } catch (error) {
    console.error('Error saving tabs:', error);
  }
}

async function generateMarkdown(tabs) {
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
    const metadata = tabMetadata.get(tab.id) || {};
    const parentId = metadata.openerTabId;
    
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
    const metadata = tabMetadata.get(tab.id) || {};
    
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
    
    // Add metadata
    if (metadata.createdAt) {
      const created = new Date(metadata.createdAt);
      lines.push(`${indent}   - Opened: ${created.toLocaleDateString()} ${created.toLocaleTimeString()}`);
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
  
  // Add statistics at the end
  lines.push('---');
  lines.push('');
  lines.push('## Statistics');
  lines.push(`- Total tabs: ${tabs.length}`);
  lines.push(`- Pinned tabs: ${tabs.filter(t => t.pinned).length}`);
  lines.push(`- Tabs with audio: ${tabs.filter(t => t.audible).length}`);
  lines.push(`- Active tab: Tab ${tabs.findIndex(t => t.active) + 1}`);
  
  return lines.join('\n');
}