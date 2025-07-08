// Load current settings
browser.storage.local.get('saveMethod').then((result) => {
  const method = result.saveMethod || 'editor';
  document.getElementById(method + 'Option').checked = true;
  document.querySelector(`[onclick="selectOption('${method}')"]`).classList.add('selected');
});

function selectOption(method) {
  // Update UI
  document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
  document.querySelector(`[onclick="selectOption('${method}')"]`).classList.add('selected');
  document.getElementById(method + 'Option').checked = true;
}

function saveOptions() {
  const selected = document.querySelector('input[name="saveMethod"]:checked').value;
  browser.storage.local.set({ saveMethod: selected }).then(() => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 2000);
  });
} 