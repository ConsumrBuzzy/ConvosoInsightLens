/**
 * Convoso Insight Lens - Content Script
 * 
 * This script runs on Convoso report pages and:
 * 1. Scans for data tables
 * 2. Extracts all relevant data
 * 3. Applies visual transformations (heatmaps, bars)
 * 4. Responds to messages from popup/dashboard
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
    enabled: true,
    wasteThreshold: 15,         // % of Calls > 15% = waste indicator
    superstarRate: 20,          // Success Rate > 20% = superstar
    superstarSuccessCount: 10,  // OR Success Count > 10 = superstar
    grinderDials: 150,          // Dials > 150 with 0 success = grinder
    ghostDials: 20              // Dials < 20 = ghost (not enough data)
};

let CURRENT_CONFIG = { ...DEFAULT_CONFIG };

// =============================================================================
// UTILITIES
// =============================================================================

const Utils = {
    /**
     * Parse numeric values from strings like "31.73%", "1,200", "$5.00"
     * @param {string} str - The string to parse
     * @returns {number} - Parsed float value or 0
     */
    parseNum: (str) => {
        if (!str || typeof str !== 'string') return 0;
        const clean = str.replace(/[%$,]/g, '').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    },

    /**
     * Format a number as percentage string
     * @param {number} num - Number to format
     * @param {number} decimals - Decimal places (default 2)
     * @returns {string} - Formatted percentage string
     */
    formatPercent: (num, decimals = 2) => {
        if (isNaN(num) || !isFinite(num)) return '0.00%';
        return num.toFixed(decimals) + '%';
    },

    /**
     * Inject a visual bar behind cell text
     * @param {HTMLElement} cell - The TD element
     * @param {number} value - Bar width percentage (0-100)
     * @param {string} colorClass - CSS class for bar color
     */
    injectBar: (cell, value, colorClass) => {
        if (cell.querySelector('.insight-bar')) return; // Prevent duplicates
        
        const text = cell.innerText;
        const width = Math.min(Math.max(value, 0), 100); // Clamp 0-100
        
        cell.innerHTML = `
            <div class="insight-cell-wrapper">
                <div class="insight-bar ${colorClass}" style="width: ${width}%"></div>
                <span class="insight-cell-text">${text}</span>
            </div>
        `;
    },

    /**
     * Safely escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped HTML string
     */
    escapeHtml: (text) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
};

// =============================================================================
// DATA STORAGE
// =============================================================================

const extractedData = {
    summaryLists: [],
    agentDetails: [],
    rawHeaders: [],
    pageInfo: {
        url: '',
        timestamp: '',
        reportTitle: ''
    }
};

// =============================================================================
// TABLE PROCESSING
// =============================================================================

/**
 * Process Summary Tables ("Lowest Success Lists" / "Top Success Lists")
 * @param {HTMLTableElement} table - The table element
 * @param {string} type - 'BAD' for lowest, 'GOOD' for top
 */
function processSummaryTable(table, type) {
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;

        // Column mapping per design document:
        // Col 0: List Name
        // Col 1: % of Calls (Volume) or Contact Rate
        // Col 2: Success Rate (KPI)
        
        const listName = cells[0].innerText.replace(/(\sWaste|\sStar)$/i, '').trim();
        const volumeText = cells[1].innerText.trim();
        const successText = cells[2].innerText.trim();
        
        const volumeVal = Utils.parseNum(volumeText);
        const successVal = Utils.parseNum(successText);

        // Apply visual transformations if enabled
        if (CURRENT_CONFIG.enabled) {
            if (type === 'BAD') {
                // Lowest Success - highlight high volume as waste
                if (volumeVal > CURRENT_CONFIG.wasteThreshold) {
                    Utils.injectBar(cells[1], volumeVal * 2, 'insight-bar-red');
                    if (!cells[0].querySelector('.insight-badge')) {
                        cells[0].innerHTML += `<span class="insight-badge badge-waste">⚠️ Waste</span>`;
                    }
                }
            } else if (type === 'GOOD') {
                // Top Success - highlight high success as opportunity
                Utils.injectBar(cells[2], successVal * 2, 'insight-bar-green');
                if (successVal > 50 && !cells[0].querySelector('.insight-badge')) {
                    cells[0].innerHTML += `<span class="insight-badge badge-star">⭐ Star</span>`;
                }
            }
        }

        // Store extracted data
        extractedData.summaryLists.push({
            type: type === 'BAD' ? 'Lowest Success' : 'Top Success',
            listName,
            volumeMetric: volumeText,
            successMetric: successText,
            volumeValue: volumeVal,
            successValue: successVal,
            isWaste: type === 'BAD' && volumeVal > CURRENT_CONFIG.wasteThreshold
        });
    });
}

/**
 * Process Agent/Campaign Detail Tables
 * Extracts all columns and applies heatmap classifications
 * @param {HTMLTableElement} table - The table element
 */
function processAgentTable(table) {
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    // Extract headers dynamically
    const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.innerText.trim());
    extractedData.rawHeaders = headers;

    // Build column index map for known important columns
    const colIndex = {
        user: headers.findIndex(h => /^user$/i.test(h)),
        campaign: headers.findIndex(h => /^campaign$/i.test(h)),
        list: headers.findIndex(h => /^list$/i.test(h)),
        dialed: headers.findIndex(h => /^dialed$/i.test(h)),
        contacts: headers.findIndex(h => /^contacts?$/i.test(h)),
        success: headers.findIndex(h => /^success$/i.test(h)),
        callSuccessRate: headers.findIndex(h => /call\s*success\s*rate/i.test(h)),
        appt: headers.findIndex(h => /^appt$/i.test(h)),
        lxfer: headers.findIndex(h => /^lxfer$/i.test(h)),
        availTime: headers.findIndex(h => /avail\s*time/i.test(h)),
        talkTime: headers.findIndex(h => /talk\s*time/i.test(h)),
        pauseTime: headers.findIndex(h => /pause\s*time/i.test(h)),
        waitTime: headers.findIndex(h => /wait\s*time/i.test(h))
    };

    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return; // Need minimum columns

        // Extract all cell values into an object keyed by header
        const rowData = {};
        headers.forEach((header, idx) => {
            if (cells[idx]) {
                rowData[header] = cells[idx].innerText.trim();
            }
        });

        // Parse key numeric values for classification
        const dialed = colIndex.dialed !== -1 ? Utils.parseNum(cells[colIndex.dialed]?.innerText) : 0;
        const successCount = colIndex.success !== -1 ? Utils.parseNum(cells[colIndex.success]?.innerText) : 0;
        const successRate = colIndex.callSuccessRate !== -1 ? Utils.parseNum(cells[colIndex.callSuccessRate]?.innerText) : 0;
        const contacts = colIndex.contacts !== -1 ? Utils.parseNum(cells[colIndex.contacts]?.innerText) : 0;
        const appt = colIndex.appt !== -1 ? Utils.parseNum(cells[colIndex.appt]?.innerText) : 0;
        const lxfer = colIndex.lxfer !== -1 ? Utils.parseNum(cells[colIndex.lxfer]?.innerText) : 0;

        // === CALCULATED METRICS ===
        // These are the KPIs requested by the user
        const calculatedMetrics = {
            // APPT % of Calls = (APPT / Dialed) * 100
            apptPercentOfCalls: dialed > 0 ? (appt / dialed) * 100 : 0,
            
            // APPT % of Contacts = (APPT / Contacts) * 100
            apptPercentOfContacts: contacts > 0 ? (appt / contacts) * 100 : 0,
            
            // LXFER % of Calls = (LXFER / Dialed) * 100
            lxferPercentOfCalls: dialed > 0 ? (lxfer / dialed) * 100 : 0,
            
            // LXFER % of Contacts = (LXFER / Contacts) * 100
            lxferPercentOfContacts: contacts > 0 ? (lxfer / contacts) * 100 : 0,
            
            // Contact Rate = (Contacts / Dialed) * 100
            contactRate: dialed > 0 ? (contacts / dialed) * 100 : 0,
            
            // Success % of Contacts = (Success / Contacts) * 100
            successPercentOfContacts: contacts > 0 ? (successCount / contacts) * 100 : 0
        };

        // === CLASSIFICATION LOGIC ===
        let insight = 'none';
        
        // Remove existing insight classes
        row.classList.remove('insight-row-superstar', 'insight-row-grinder');

        if (CURRENT_CONFIG.enabled) {
            if (successRate > CURRENT_CONFIG.superstarRate || successCount > CURRENT_CONFIG.superstarSuccessCount) {
                // SUPERSTAR: High success rate OR high success count
                row.classList.add('insight-row-superstar');
                insight = 'superstar';
            } else if (dialed > CURRENT_CONFIG.grinderDials && successCount < 1) {
                // GRINDER: High effort, zero results
                row.classList.add('insight-row-grinder');
                insight = 'grinder';
            }
        }

        // Store extracted data with raw values and calculated metrics
        extractedData.agentDetails.push({
            insight,
            raw: rowData,
            parsed: {
                dialed,
                contacts,
                successCount,
                successRate,
                appt,
                lxfer
            },
            calculated: calculatedMetrics
        });
    });
}

/**
 * Main scanner - finds and processes all relevant tables on the page
 */
function runScanner() {
    // Clear previous data
    extractedData.summaryLists = [];
    extractedData.agentDetails = [];
    extractedData.rawHeaders = [];
    extractedData.pageInfo = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        reportTitle: document.querySelector('h1, h2, .report-title')?.innerText || 'Convoso Report'
    };

    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        
        const headerText = Array.from(headerRow.querySelectorAll('th'))
            .map(th => th.innerText)
            .join(' ');
        
        // Identify table type by header content
        if (headerText.includes('Lowest Success')) {
            processSummaryTable(table, 'BAD');
        } else if (headerText.includes('Top Success')) {
            processSummaryTable(table, 'GOOD');
        } else if (
            (headerText.includes('User') && headerText.includes('Campaign')) ||
            (headerText.includes('User') && headerText.includes('Dialed'))
        ) {
            processAgentTable(table);
        }
    });

    console.log('[Convoso Insight Lens] Scan complete:', {
        summaryLists: extractedData.summaryLists.length,
        agentDetails: extractedData.agentDetails.length
    });
}

/**
 * Compile all extracted data into a report object
 * @returns {Object} - Complete report data
 */
function compileReportData() {
    return {
        ...extractedData.pageInfo,
        config: CURRENT_CONFIG,
        headers: extractedData.rawHeaders,
        summaryLists: extractedData.summaryLists,
        agentDetails: extractedData.agentDetails,
        summary: {
            totalAgents: extractedData.agentDetails.length,
            superstars: extractedData.agentDetails.filter(a => a.insight === 'superstar').length,
            grinders: extractedData.agentDetails.filter(a => a.insight === 'grinder').length,
            ghosts: extractedData.agentDetails.filter(a => a.insight === 'ghost').length,
            wasteLists: extractedData.summaryLists.filter(l => l.isWaste).length,
            topLists: extractedData.summaryLists.filter(l => l.type === 'Top Success').length
        }
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Load configuration from Chrome storage and run scanner
 */
function loadConfigAndRun() {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        CURRENT_CONFIG = { ...DEFAULT_CONFIG, ...items };
        if (CURRENT_CONFIG.enabled) {
            runScanner();
        }
    });
}

// Initial run
console.log('[Convoso Insight Lens] Content script loaded.');
loadConfigAndRun();

// =============================================================================
// MUTATION OBSERVER - Handle dynamic Angular updates
// =============================================================================

let debounceTimer;
const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (CURRENT_CONFIG.enabled) {
            runScanner();
        }
    }, 500);
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// =============================================================================
// MESSAGE HANDLER - Communication with popup/dashboard
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'configUpdated':
            // Reload config and re-scan
            loadConfigAndRun();
            sendResponse({ status: 'ok', message: 'Configuration reloaded' });
            break;
            
        case 'requestData':
            // Return compiled report data
            runScanner(); // Ensure fresh data
            const reportData = compileReportData();
            sendResponse({ status: 'ok', data: reportData });
            break;
            
        case 'ping':
            // Health check
            sendResponse({ status: 'ok', message: 'Content script active' });
            break;
            
        default:
            sendResponse({ status: 'error', message: 'Unknown action' });
    }
    return true; // Keep message channel open for async response
});
