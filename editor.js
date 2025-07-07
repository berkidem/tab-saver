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

// Preview functionality
function updatePreview() {
  const content = document.getElementById('editor').value;
  const preview = document.getElementById('preview');
  
  // Simple markdown to HTML conversion
  let html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Lists
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Wrap lists
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
  preview.innerHTML = html;
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

