// Get markdown content from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const markdown = urlParams.get('content') || '';
const defaultFilename = urlParams.get('filename') || 'tabs.md';

// Set initial content and filename
document.getElementById('editor').value = decodeURIComponent(markdown);
document.getElementById('filenameInput').value = defaultFilename;

// Focus on filename input and select all text for easy renaming
const filenameInput = document.getElementById('filenameInput');
filenameInput.focus();
filenameInput.select();

// Auto-save to localStorage
let saveTimeout;
document.getElementById('editor').addEventListener('input', (e) => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem('tabsaver-draft', e.target.value);
    showStatus('Draft saved locally');
  }, 1000);
  
  updatePreview();
});

// Load draft if exists
const draft = localStorage.getItem('tabsaver-draft');
if (draft && !markdown) {
  document.getElementById('editor').value = draft;
}

// Simple scroll sync between editor and preview
let isScrolling = false; // Flag to prevent infinite scroll loops

function syncScroll() {
  if (isScrolling) return;
  isScrolling = true;
  
  const editor = document.getElementById('editor');
  const previewContainer = document.getElementById('previewContainer');
  
  // Calculate scroll percentage of editor
  const editorMaxScroll = editor.scrollHeight - editor.clientHeight;
  if (editorMaxScroll <= 0) {
    isScrolling = false;
    return; // No scrolling needed
  }
  
  const scrollPercentage = editor.scrollTop / editorMaxScroll;
  
  // Apply same percentage to preview container
  const maxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
  if (maxScroll > 0) {
    previewContainer.scrollTop = scrollPercentage * maxScroll;
  }
  
  setTimeout(() => { isScrolling = false; }, 10);
}

function syncScrollReverse() {
  if (isScrolling) return;
  isScrolling = true;
  
  const editor = document.getElementById('editor');
  const previewContainer = document.getElementById('previewContainer');
  
  // Calculate scroll percentage of preview
  const previewMaxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
  if (previewMaxScroll <= 0) {
    isScrolling = false;
    return; // No scrolling needed
  }
  
  const scrollPercentage = previewContainer.scrollTop / previewMaxScroll;
  
  // Apply same percentage to editor
  const editorMaxScroll = editor.scrollHeight - editor.clientHeight;
  if (editorMaxScroll > 0) {
    editor.scrollTop = scrollPercentage * editorMaxScroll;
  }
  
  setTimeout(() => { isScrolling = false; }, 10);
}

// Add scroll sync listeners for both directions
document.getElementById('editor').addEventListener('scroll', syncScroll);
document.getElementById('previewContainer').addEventListener('scroll', syncScrollReverse);

// Helper function to process markdown formatting (links and bold text)
function processMarkdownText(text, container) {
  const parts = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/);
  parts.forEach(part => {
    if (part.match(/\[.*?\]\(.*?\)/)) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      const a = document.createElement('a');
      a.textContent = match[1];
      a.href = match[2];
      a.target = '_blank';
      container.appendChild(a);
    } else if (part.match(/\*\*.*?\*\*/)) {
      const strong = document.createElement('strong');
      strong.textContent = part.replace(/\*\*/g, '');
      container.appendChild(strong);
    } else if (part) {
      container.appendChild(document.createTextNode(part));
    }
  });
}

// Preview functionality using DOM manipulation (no innerHTML)
function updatePreview() {
  const content = document.getElementById('editor').value;
  const preview = document.getElementById('preview');
  
  // Clear previous content
  preview.textContent = '';
  
  const lines = content.split('\n');
  let currentList = null;
  let listType = null;
  let currentIndentLevel = 0;
  
  lines.forEach(line => {
    const originalLine = line;
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
        listType = null;
        currentIndentLevel = 0;
      }
      preview.appendChild(document.createElement('br'));
      return;
    }
    
    // Calculate indentation level
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    
    // Headers
    if (trimmedLine.startsWith('### ')) {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
        listType = null;
        currentIndentLevel = 0;
      }
      const h3 = document.createElement('h3');
      processMarkdownText(trimmedLine.substring(4), h3);
      preview.appendChild(h3);
    } else if (trimmedLine.startsWith('## ')) {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
        listType = null;
        currentIndentLevel = 0;
      }
      const h2 = document.createElement('h2');
      processMarkdownText(trimmedLine.substring(3), h2);
      preview.appendChild(h2);
    } else if (trimmedLine.startsWith('# ')) {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
        listType = null;
        currentIndentLevel = 0;
      }
      const h1 = document.createElement('h1');
      processMarkdownText(trimmedLine.substring(2), h1);
      preview.appendChild(h1);
    }
    // Numbered lists - preserve original numbers
    else if (trimmedLine.match(/^\d+\. /)) {
      // If different indent level or not an ordered list, create new list
      if (!currentList || listType !== 'ol' || indentLevel !== currentIndentLevel) {
        if (currentList) preview.appendChild(currentList);
        currentList = document.createElement('ol');
        listType = 'ol';
        currentIndentLevel = indentLevel;
        
        // Extract the number to set the start attribute
        const numberMatch = trimmedLine.match(/^(\d+)\. /);
        if (numberMatch && parseInt(numberMatch[1]) > 1) {
          currentList.setAttribute('start', numberMatch[1]);
        }
      }
      
      const li = document.createElement('li');
      processMarkdownText(trimmedLine.replace(/^\d+\. /, ''), li);
      currentList.appendChild(li);
    } 
    // Bullet points and nested items
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      // If different indent level or not an unordered list, create new list
      if (!currentList || listType !== 'ul' || indentLevel !== currentIndentLevel) {
        if (currentList) preview.appendChild(currentList);
        currentList = document.createElement('ul');
        listType = 'ul';
        currentIndentLevel = indentLevel;
      }
      
      const li = document.createElement('li');
      const text = trimmedLine.startsWith('- ') ? trimmedLine.substring(2) : trimmedLine.substring(2);
      processMarkdownText(text, li);
      currentList.appendChild(li);
    }
            // Handle nested indented content (like sub-items under numbered lists)
        else if (indentLevel > 0 && currentList) {
          // This is likely a nested item under a list item
          const li = document.createElement('li');
          li.style.listStyle = 'none';
          li.style.marginLeft = `${(indentLevel - currentIndentLevel) * 20}px`;
          
          // Handle different bullet styles with proper indentation
          if (trimmedLine.startsWith('↳ ')) {
            li.style.paddingLeft = '0';
            processMarkdownText(trimmedLine, li);
          } else if (trimmedLine.startsWith('• ')) {
            // Previous URLs with bullet points - make them look like sub-items
            li.style.color = '#93a1a1'; // Slightly muted color for sub-items
            li.style.fontSize = '13px';
            processMarkdownText(trimmedLine, li);
          } else {
            processMarkdownText(trimmedLine, li);
          }
          
          currentList.appendChild(li);
        }
    // Horizontal rules
    else if (trimmedLine === '---') {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
        listType = null;
        currentIndentLevel = 0;
      }
      preview.appendChild(document.createElement('hr'));
    }
    // Regular text with formatting
    else {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
        listType = null;
        currentIndentLevel = 0;
      }
      const p = document.createElement('p');
      processMarkdownText(trimmedLine, p);
      preview.appendChild(p);
    }
  });
  
  // Don't forget to append any remaining list
  if (currentList) {
    preview.appendChild(currentList);
  }
  
  // Sync scroll after updating preview
  setTimeout(syncScroll, 0);
}

// Initial preview
updatePreview();

// Button handlers
document.getElementById('saveBtn').addEventListener('click', () => {
  const content = document.getElementById('editor').value;
  const filename = document.getElementById('filenameInput').value || 'tabs.md';
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }).then(() => {
    showStatus('Saved to Downloads folder!');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const content = document.getElementById('editor').value;
  const filename = document.getElementById('filenameInput').value || 'tabs.md';
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  browser.downloads.download({
    url: url,
    filename: filename,
    saveAs: true  // This will show the save dialog
  }).then(() => {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const content = document.getElementById('editor').value;
  navigator.clipboard.writeText(content).then(() => {
    showStatus('Copied to clipboard!');
  });
});

document.getElementById('togglePreview').addEventListener('click', () => {
  const preview = document.getElementById('previewContainer');
  preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
});

// Show status message
function showStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.classList.add('show');
  setTimeout(() => status.classList.remove('show'), 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's') {
      e.preventDefault();
      document.getElementById('saveBtn').click();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('downloadBtn').click();
    }
  }
});

// Save on Enter in filename field
document.getElementById('filenameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('saveBtn').click();
  }
});

