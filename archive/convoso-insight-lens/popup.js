// --- POPUP INITIALIZATION ---

// Load saved configuration when popup opens
document.addEventListener('DOMContentLoaded', () => {
    loadConfiguration();
    setupEventListeners();
});

// --- CONFIGURATION MANAGEMENT ---

/**
 * Load configuration from Chrome storage
 */
function loadConfiguration() {
    chrome.storage.sync.get(['enabled', 'wasteThreshold', 'superstarRate', 'grinderDials', 'ghostDials'], (result) => {
        // Set toggle state
        const enableToggle = document.getElementById('enableToggle');
        enableToggle.checked = result.enabled !== false; // Default to enabled

        // Set configuration values
        document.getElementById('wasteThreshold').value = result.wasteThreshold || 15;
        document.getElementById('superstarRate').value = result.superstarRate || 20;
        document.getElementById('grinderDials').value = result.grinderDials || 150;
        document.getElementById('ghostDials').value = result.ghostDials || 20;
    });
}

/**
 * Save configuration to Chrome storage
 */
function saveConfiguration() {
    const config = {
        enabled: document.getElementById('enableToggle').checked,
        wasteThreshold: parseInt(document.getElementById('wasteThreshold').value) || 15,
        superstarRate: parseInt(document.getElementById('superstarRate').value) || 20,
        grinderDials: parseInt(document.getElementById('grinderDials').value) || 150,
        ghostDials: parseInt(document.getElementById('ghostDials').value) || 20
    };

    chrome.storage.sync.set(config, () => {
        // Show feedback
        const saveButton = document.getElementById('saveConfig');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.style.backgroundColor = '#059669';

        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.backgroundColor = '';
        }, 2000);

        // Notify content script of configuration change
        notifyContentScript();
    });
}

/**
 * Notify the content script that configuration has changed
 */
function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'configUpdated' }, (response) => {
                // Response handling - optional
            }).catch(() => {
                // Content script may not be loaded on this page
            });
        }
    });
}

// --- EVENT LISTENERS ---

/**
 * Setup event listeners for UI interactions
 */
function setupEventListeners() {
    // Toggle button
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', () => {
        saveConfiguration();
    });

    // Save configuration button
    const saveButton = document.getElementById('saveConfig');
    saveButton.addEventListener('click', saveConfiguration);

    // Allow Enter key to save in input fields
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveConfiguration();
            }
        });
    });
}
