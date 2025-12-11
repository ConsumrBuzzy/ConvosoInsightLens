/**
 * Convoso Insight Lens - Popup Script
 * Opens overlay dashboard on Convoso page
 * Manages threshold settings
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check current status
    checkStatus();
    
    // Load saved thresholds
    loadThresholds();

    // Open Dashboard button
    document.getElementById('openDashboard').addEventListener('click', () => {
        sendToContent('openOverlay', (response) => {
            if (response && response.status === 'ok') {
                window.close(); // Close popup after opening overlay
            }
        });
    });

    // Save Thresholds button
    document.getElementById('saveThresholds').addEventListener('click', saveThresholds);
});

/**
 * Check status from content script
 */
function checkStatus() {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            showError('No active tab');
            return;
        }

        if (!tabs[0].url.includes('convoso.com')) {
            showError('Not on Convoso');
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
            if (chrome.runtime.lastError) {
                showError('Refresh page');
                return;
            }

            if (response && response.status === 'ok') {
                updateUI(response.enabled, response.columnsInjected);
            }
        });
    });
}

/**
 * Send message to content script
 */
function sendToContent(action, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
            if (callback) callback(response);
        });
    });
}

/**
 * Update UI based on status
 */
function updateUI(enabled, columnsInjected) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    statusText.textContent = 'Ready - Click to open dashboard';
    statusDot.className = 'status-dot active';
}

/**
 * Show error state
 */
function showError(message) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    const btn = document.getElementById('openDashboard');

    statusText.textContent = message;
    statusDot.className = 'status-dot error';
    btn.disabled = true;
    btn.textContent = 'Unavailable';
}

/**
 * Load threshold settings from storage
 */
function loadThresholds() {
    chrome.storage.local.get('insightLens', (result) => {
        if (result.insightLens && result.insightLens.thresholds) {
            document.getElementById('thresholdGood').value = result.insightLens.thresholds.good || 10;
            document.getElementById('thresholdMedium').value = result.insightLens.thresholds.medium || 5;
        }
    });
}

/**
 * Save threshold settings to storage and notify content script
 */
function saveThresholds() {
    const good = parseInt(document.getElementById('thresholdGood').value) || 10;
    const medium = parseInt(document.getElementById('thresholdMedium').value) || 5;

    // Validate: good should be >= medium
    if (good < medium) {
        alert('Green threshold must be >= Yellow threshold');
        return;
    }

    chrome.storage.local.get('insightLens', (result) => {
        const settings = result.insightLens || {};
        settings.thresholds = { good, medium };

        chrome.storage.local.set({ insightLens: settings }, () => {
            // Notify content script to refresh
            sendToContent('refresh', (response) => {
                const btn = document.getElementById('saveThresholds');
                btn.textContent = '✓ Saved!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.textContent = 'Save Thresholds';
                    btn.style.background = '';
                }, 1500);
            });
        });
    });
}
