/**
 * Convoso Insight Lens - Popup Script
 * Simple toggle control for inline column injection
 */

document.addEventListener('DOMContentLoaded', () => {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    const toggleBtn = document.getElementById('toggleBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    // Check current status
    checkStatus();

    // Toggle button
    toggleBtn.addEventListener('click', () => {
        sendToContent('toggle', (response) => {
            if (response && response.status === 'ok') {
                updateUI(response.enabled, response.columnsInjected);
            }
        });
    });

    // Refresh button
    refreshBtn.addEventListener('click', () => {
        sendToContent('refresh', () => {
            checkStatus();
        });
    });
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
    const toggleBtn = document.getElementById('toggleBtn');

    if (enabled && columnsInjected) {
        statusText.textContent = 'Active - Columns Added';
        statusDot.className = 'status-dot active';
        toggleBtn.textContent = 'Turn OFF';
        toggleBtn.className = 'btn btn-off';
    } else if (enabled) {
        statusText.textContent = 'Ready';
        statusDot.className = 'status-dot ready';
        toggleBtn.textContent = 'Turn ON';
        toggleBtn.className = 'btn btn-on';
    } else {
        statusText.textContent = 'Disabled';
        statusDot.className = 'status-dot off';
        toggleBtn.textContent = 'Turn ON';
        toggleBtn.className = 'btn btn-on';
    }
}

/**
 * Show error state
 */
function showError(message) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    const toggleBtn = document.getElementById('toggleBtn');

    statusText.textContent = message;
    statusDot.className = 'status-dot error';
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Unavailable';
}
