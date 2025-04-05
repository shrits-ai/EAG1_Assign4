// options.js

const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load the saved API key when the options page opens
function loadApiKey() {
  chrome.storage.local.get(['googleApiKey'], (result) => {
    if (result.googleApiKey) {
      apiKeyInput.value = result.googleApiKey;
      console.log('API Key loaded.');
    } else {
      console.log('API Key not found in storage.');
    }
  });
}

// Save the API key
function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    chrome.storage.local.set({ 'googleApiKey': apiKey }, () => {
      statusDiv.textContent = 'API Key saved successfully!';
      console.log('API Key saved.');
      setTimeout(() => { statusDiv.textContent = ''; }, 3000); // Clear status after 3 seconds
    });
  } else {
    statusDiv.textContent = 'Please enter an API Key.';
    statusDiv.style.color = 'red';
     setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.style.color = 'black'; // Reset color
     }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', loadApiKey);
saveButton.addEventListener('click', saveApiKey);