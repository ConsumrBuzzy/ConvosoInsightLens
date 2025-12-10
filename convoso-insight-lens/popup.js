/**
 * Convoso Insight Lens - Popup Script
 * Handles popup UI, configuration, and communication with content script.
 */

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadConfiguration();
    setupEventListeners();
    checkConnection();
});

// =============================================================================
// CONFIGURATION MANAGEMENT
// =============================================================================

const DEFAULT_CONFIG = {
    enabled: true,
    wasteThreshold: 15,
    superstarRate: 20,
    superstarSuccessCount: 10,
    grinderDials: 150,
    ghostDials: 20
};

/**
 * Load saved configuration from Chrome storage
 */
function loadConfiguration() {
    chrome.storage.sync.get(DEFAULT_CONFIG, (result) => {
        document.getElementById('enableToggle').checked = result.enabled !== false;
        document.getElementById('wasteThreshold').value = result.wasteThreshold || 15;
        document.getElementById('superstarRate').value = result.superstarRate || 20;
        document.getElementById('superstarCount').value = result.superstarSuccessCount || 10;
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
        superstarSuccessCount: parseInt(document.getElementById('superstarCount').value) || 10,
        grinderDials: parseInt(document.getElementById('grinderDials').value) || 150,
        ghostDials: parseInt(document.getElementById('ghostDials').value) || 20
    };

    chrome.storage.sync.set(config, () => {
        // Visual feedback
        const saveBtn = document.getElementById('saveConfig');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✓ Saved!';
        saveBtn.classList.add('saved');

        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('saved');
        }, 1500);

        // Notify content script
        notifyContentScript('configUpdated');
    });
}

// =============================================================================
// CONNECTION & DATA
// =============================================================================

/**
 * Check if we're connected to a Convoso page and fetch quick stats
 */
function checkConnection() {
    const statusBar = document.getElementById('statusBar');
    const quickStats = document.getElementById('quickStats');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            setStatus('error', 'No active tab');
            return;
        }

        const url = tabs[0].url || '';
        
        // Check if on Convoso
        if (!url.includes('convoso.com')) {
            setStatus('inactive', 'Not on Convoso');
            quickStats.style.display = 'none';
            return;
        }

        // Try to ping content script
        chrome.tabs.sendMessage(tabs[0].id, { action: 'requestData' }, (response) => {
            if (chrome.runtime.lastError) {
                setStatus('error', 'Extension not loaded on page');
                quickStats.style.display = 'none';
                return;
            }

            if (response && response.status === 'ok' && response.data) {
                setStatus('connected', 'Connected');
                displayQuickStats(response.data.summary);
                quickStats.style.display = 'grid';
            } else {
                setStatus('inactive', 'No report data found');
                quickStats.style.display = 'none';
            }
        });
    });
}

/**
 * Update status bar UI
 */
function setStatus(type, message) {
    const statusBar = document.getElementById('statusBar');
    statusBar.className = `status-bar status-${type}`;
    statusBar.querySelector('.status-text').textContent = message;
}

/**
 * Display quick stats from report data
 */
function displayQuickStats(summary) {
    if (!summary) return;
    
    document.getElementById('statAgents').textContent = summary.totalAgents || 0;
    document.getElementById('statSuperstars').textContent = summary.superstars || 0;
    document.getElementById('statGrinders').textContent = summary.grinders || 0;
    document.getElementById('statWaste').textContent = summary.wasteLists || 0;
}

/**
 * Send message to content script
 */
function notifyContentScript(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action }).catch(() => {
                // Content script not available - that's okay
            });
        }
    });
}

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * Open full dashboard in new window
 */
function openDashboard() {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    chrome.windows.create({
        url: dashboardUrl,
        type: 'popup',
        width: 1280,
        height: 900
    });
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // Toggle switch - auto-save
    document.getElementById('enableToggle').addEventListener('change', saveConfiguration);

    // Save config button
    document.getElementById('saveConfig').addEventListener('click', saveConfiguration);

    // Dashboard button
    document.getElementById('openDashboard').addEventListener('click', openDashboard);

    // Enter key in config inputs
    document.querySelectorAll('.config-content input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveConfiguration();
        });
    });
}
