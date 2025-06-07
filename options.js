// Handle options for PharmaTalent extension

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('api-base-url');
  const status = document.getElementById('status');

  // Load saved value
  chrome.storage.local.get('pt_base_url', (result) => {
    input.value = result.pt_base_url || 'https://linkedin-profile-scraper.replit.app';
  });

  // Save button handler
  document.getElementById('save-button').addEventListener('click', () => {
    const url = input.value.trim();
    chrome.storage.local.set({ pt_base_url: url }, () => {
      status.textContent = 'Options saved.';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });
});
