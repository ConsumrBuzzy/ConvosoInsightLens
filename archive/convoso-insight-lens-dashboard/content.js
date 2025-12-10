// --- CONFIGURATION ---
const DEFAULT_CONFIG = {
    enabled: true,
    wasteThreshold: 15,      // If % of calls > 15%, mark as waste
    superstarRate: 20,       // Success rate > 20% = Superstar
    superstarSuccessCount: 10, // OR Success Count > 10 = Superstar
    grinderDials: 150,       // Dials > 150 with low success = Grinder
    ghostDials: 20           // Dials < 20 = Ghost (ignore)
};
let CURRENT_CONFIG = DEFAULT_CONFIG;

// Load configuration from storage
function loadConfigAndRun() {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        CURRENT_CONFIG = items;
        if (CURRENT_CONFIG.enabled) {
            runScanner();
        } else {
            // Optionally remove classes if disabled, but for now, just stop scanning
        }
    });
}

// --- UTILITIES ---
const Utils = {
    // Turns "31.73%" -> 31.73 or "1,200" -> 1200
    parseNum: (str) => {
        if (!str) return 0;
        const clean = str.replace(/[%$,]/g, '').trim();
        return parseFloat(clean) || 0;
    },

    // Injects a colored bar behind the text
    injectBar: (cell, value, colorClass) => {
        if (cell.querySelector('.insight-bar')) return; // Avoid double injection
        
        const text = cell.innerText;
        // Cap visual width at 100% so it doesn't break layout
        const width = Math.min(value, 100); 
        
        cell.innerHTML = `
            <div class="insight-cell-wrapper">
                <div class="insight-bar ${colorClass}" style="width: ${width}%"></div>
                <span style="font-weight:bold;">${text}</span>
            </div>
        `;
    },

    // Check if element already has insight classes applied
    hasInsightClass: (element) => {
        return element.classList.contains('insight-row-superstar') ||
               element.classList.contains('insight-row-grinder') ||
               element.classList.contains('insight-row-ghost');
    }
};

// --- DATA STORAGE ---
const extractedData = {
    summaryLists: [],
    agentDetails: []
};

// --- MAIN LOGIC ---

/**
 * Humanize "Lowest Success Lists" and "Top Success Lists" tables
 * These are summary tables with visual bars
 */
function humanizeSummaryTable(table, type) {
    if (!CURRENT_CONFIG.enabled) return;
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;

        // Based on design doc:
        // Col 0: List Name
        // Col 1: % of Calls (Volume) or Contact Rate
        // Col 2: Success Rate (KPI)
        
        const listName = cells[0].innerText.replace(/(\sWaste|\sStar)$/i, '').trim();
        const volText = cells[1].innerText;
        const successText = cells[2].innerText;
        
        const volVal = Utils.parseNum(volText);
        const successVal = Utils.parseNum(successText);

        // --- VISUAL LOGIC (Original Feature) ---
        if (type === 'BAD') {
            // "Lowest Success Lists" - High Volume here is bad!
            if (volVal > CURRENT_CONFIG.wasteThreshold) {
                Utils.injectBar(cells[1], volVal * 2, 'insight-bar-red'); // *2 to make bar more visible
                // Add badge to list name if not already present
                if (!cells[0].querySelector('.insight-badge')) {
                    cells[0].innerHTML += `<span class="insight-badge badge-waste">Waste</span>`;
                }
            }
        } else if (type === 'GOOD') {
            // "Top Success Lists" - High Success here is good!
            Utils.injectBar(cells[2], successVal * 2, 'insight-bar-green');
            // Add badge if success is very high
            if (successVal > 50 && !cells[0].querySelector('.insight-badge')) {
                cells[0].innerHTML += `<span class="insight-badge badge-star">Star</span>`;
            }
        }
        // --- DATA EXTRACTION (New Feature) ---
        extractedData.summaryLists.push({
            type: type === 'BAD' ? 'Lowest Success' : 'Top Success',
            listName: listName,
            volumeMetric: volText,
            successMetric: successText,
            volumeValue: volVal,
            successValue: successVal,
            isWaste: type === 'BAD' && volVal > CURRENT_CONFIG.wasteThreshold
        });
    });
}

/**
 * Humanize Agent/Campaign Detail tables
 * These are large tables with row-based heatmap coloring
 */
function humanizeAgentTable(table) {
    if (!CURRENT_CONFIG.enabled) return;
    const rows = table.querySelectorAll('tbody tr');
    
    // Get headers dynamically for comprehensive report
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        // Need enough columns to be the Detail table
        if (cells.length < 9) return; 

        // Find column indices dynamically
        const dialedIndex = headers.indexOf('Dialed');
        const successCountIndex = headers.indexOf('Success');
        const successRateIndex = headers.indexOf('Call Success Rate');

        // Use hardcoded indices as fallback if headers are not found (based on original design doc)
        const dIndex = dialedIndex !== -1 ? dialedIndex : 4;
        const scIndex = successCountIndex !== -1 ? successCountIndex : 7;
        const srIndex = successRateIndex !== -1 ? successRateIndex : 8;
        
        const dialed = Utils.parseNum(cells[dIndex].innerText);
        const successCount = Utils.parseNum(cells[scIndex].innerText);
        const successRate = Utils.parseNum(cells[srIndex].innerText);

        // --- VISUAL LOGIC (Original Feature) ---
        // RESET classes first to allow re-processing if data changes
        row.classList.remove('insight-row-superstar', 'insight-row-grinder', 'insight-row-ghost');

        let insightClass = 'none';
        // APPLY LOGIC based on business rules
        if (successRate > CURRENT_CONFIG.superstarRate || successCount > CURRENT_CONFIG.superstarSuccessCount) {
            // The Superstar: High success rate or high success count
            row.classList.add('insight-row-superstar');
            insightClass = 'superstar';
        } else if (dialed > CURRENT_CONFIG.grinderDials && successCount < 1) {
            // The Grinder: High dials but zero success (spinning wheels)
            row.classList.add('insight-row-grinder');
            insightClass = 'grinder';
        } else if (dialed < CURRENT_CONFIG.ghostDials) {
            // The Ghost: Not enough data yet
            row.classList.add('insight-row-ghost');
            insightClass = 'ghost';
        }

        // --- DATA EXTRACTION (New Feature) ---
        const rowData = { insight: insightClass };
        cells.forEach((cell, index) => {
            const header = headers[index] || `Col ${index}`;
            rowData[header] = cell.innerText.trim();
        });
        extractedData.agentDetails.push(rowData);
    });
}

/**
 * Main scanner function that identifies and processes tables
 */
function runScanner() {
    // Clear previous data before a new scan
    extractedData.summaryLists = [];
    extractedData.agentDetails = [];

    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        // Get header text to identify table type
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        
        const headerCells = headerRow.querySelectorAll('th');
        const headerTexts = Array.from(headerCells).map(th => th.innerText);
        const headerText = headerTexts.join(' ');
        
        // Identify table type and process accordingly
        if (headerText.includes("Lowest Success")) {
            humanizeSummaryTable(table, 'BAD');
        } else if (headerText.includes("Top Success")) {
            humanizeSummaryTable(table, 'GOOD');
        } else if (headerText.includes("User") && headerText.includes("Campaign")) {
            // Agent/Campaign Detail table
            humanizeAgentTable(table);
        } else if (headerText.includes("User") && headerText.includes("Dialed")) {
            // Alternative detection for Agent Detail table
            humanizeAgentTable(table);
        }
    });
}

/**
 * Compiles all extracted data into a single object for the report.
 */
function compileReportData() {
    return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        config: CURRENT_CONFIG,
        summaryLists: extractedData.summaryLists,
        agentDetails: extractedData.agentDetails
    };
}

// --- INITIALIZATION ---

console.log("Convoso Insight Lens: Loaded and ready to transform reports.");

// 1. Run immediately in case page is ready
loadConfigAndRun();

// 2. Set up Observer for Angular changes
// This watches the body for any added nodes (like new table rows loaded via AJAX)
let debounceTimer;
const observer = new MutationObserver((mutations) => {
    // Debounce: Only run scanner 500ms after the last DOM change stops
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (CURRENT_CONFIG.enabled) {
            runScanner();
        }
    }, 500);
});

// Start observing the document for changes
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false
});

// Listen for messages from popup to handle configuration updates and data requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'configUpdated') {
        // Reload config and re-run scanner
        loadConfigAndRun();
        sendResponse({ status: 'config reloaded' });
    } else if (request.action === 'requestData') {
        // Ensure the latest data is scanned before compiling
        runScanner(); 
        const reportData = compileReportData();
        sendResponse({ status: 'data compiled', data: reportData });
    }
});
