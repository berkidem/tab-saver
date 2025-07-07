document.getElementById('saveButton').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'saveTabs' });
  
  // Show feedback
  const button = document.getElementById('saveButton');
  const originalText = button.textContent;
  button.textContent = 'Saving...';
  button.disabled = true;
  
  setTimeout(() => {
    button.textContent = 'Saved! Check your downloads';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      window.close();
    }, 1500);
  }, 500);
});

// Open options page
document.getElementById('optionsLink').addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
  window.close();
});