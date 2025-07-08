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
function syncScroll() {
  const editor = document.getElementById('editor');
  const previewContainer = document.getElementById('previewContainer');
  
  // Calculate scroll percentage of editor
  const editorMaxScroll = editor.scrollHeight - editor.clientHeight;
  if (editorMaxScroll <= 0) return; // No scrolling needed
  
  const scrollPercentage = editor.scrollTop / editorMaxScroll;
  
  // Apply same percentage to preview container
  const maxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
  if (maxScroll > 0) {
    previewContainer.scrollTop = scrollPercentage * maxScroll;
  }
}

// Add scroll sync listener
document.getElementById('editor').addEventListener('scroll', syncScroll);

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
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
      }
      preview.appendChild(document.createElement('br'));
      return;
    }
    
    // Headers
    if (line.startsWith('### ')) {
      const h3 = document.createElement('h3');
      processMarkdownText(line.substring(4), h3);
      preview.appendChild(h3);
    } else if (line.startsWith('## ')) {
      const h2 = document.createElement('h2');
      processMarkdownText(line.substring(3), h2);
      preview.appendChild(h2);
    } else if (line.startsWith('# ')) {
      const h1 = document.createElement('h1');
      processMarkdownText(line.substring(2), h1);
      preview.appendChild(h1);
    }
    // Lists
    else if (line.match(/^\d+\. /)) {
      if (!currentList || listType !== 'ol') {
        if (currentList) preview.appendChild(currentList);
        currentList = document.createElement('ol');
        listType = 'ol';
      }
      const li = document.createElement('li');
      processMarkdownText(line.replace(/^\d+\. /, ''), li);
      currentList.appendChild(li);
    } else if (line.startsWith('- ')) {
      if (!currentList || listType !== 'ul') {
        if (currentList) preview.appendChild(currentList);
        currentList = document.createElement('ul');
        listType = 'ul';
      }
      const li = document.createElement('li');
      processMarkdownText(line.substring(2), li);
      currentList.appendChild(li);
    }
    // Regular text with formatting
    else {
      if (currentList) {
        preview.appendChild(currentList);
        currentList = null;
      }
      const p = document.createElement('p');
      processMarkdownText(line, p);
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

