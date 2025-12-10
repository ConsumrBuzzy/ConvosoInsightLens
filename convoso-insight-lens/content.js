/**
 * Convoso Insight Lens - Content Script
 * 
 * APPROACH: Inject calculated columns directly into Convoso's native tables.
 * - Keeps exact same report layout
 * - Adds APPT % and LXFER % columns inline
 * - No separate dashboard - overlay toggle only
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const INSIGHT_CONFIG = {
    enabled: true,
    // Column names to look for (case-insensitive)
    columns: {
        contacts: ['contacts', 'contact'],
        appt: ['appt', 'status \'appt', 'status \'appt - appointment scheduled\'', 'appointment'],
        lxfer: ['lxfer', 'status \'lxfer', 'status \'lxfer - live transfer\'', 'live transfer'],
        success: ['success'],
        dialed: ['dialed']
    }
};

let columnsInjected = false;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Parse numeric values from strings like "31.73%", "1,200", etc.
 */
function parseNum(str) {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.replace(/[%$,]/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

/**
 * Format as percentage with 2 decimals
 */
function formatPct(num) {
    if (isNaN(num) || !isFinite(num)) return '—';
    return num.toFixed(2) + '%';
}

/**
 * Find column index by matching header text (case-insensitive, partial match)
 */
function findColumnIndex(headers, searchTerms) {
    for (let i = 0; i < headers.length; i++) {
        const headerText = headers[i].toLowerCase().trim();
        for (const term of searchTerms) {
            if (headerText.includes(term.toLowerCase())) {
                return i;
            }
        }
    }
    return -1;
}

// =============================================================================
// COLUMN INJECTION
// =============================================================================

/**
 * Process a single table - inject APPT% and LXFER% columns
 */
function processTable(table) {
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    // Get all header texts
    const headerCells = Array.from(headerRow.querySelectorAll('th'));
    const headers = headerCells.map(th => th.innerText.trim());

    // Check if we already injected columns
    if (headers.some(h => h.includes('APPT %') || h.includes('LXFER %'))) {
        return; // Already processed
    }

    // Find required columns
    const contactsIdx = findColumnIndex(headers, INSIGHT_CONFIG.columns.contacts);
    const apptIdx = findColumnIndex(headers, INSIGHT_CONFIG.columns.appt);
    const lxferIdx = findColumnIndex(headers, INSIGHT_CONFIG.columns.lxfer);
    const dialedIdx = findColumnIndex(headers, INSIGHT_CONFIG.columns.dialed);

    // Need at least contacts column to calculate percentages
    if (contactsIdx === -1) {
        console.log('[Insight Lens] Skipping table - no Contacts column found');
        return;
    }

    console.log('[Insight Lens] Processing table with columns:', { contactsIdx, apptIdx, lxferIdx, dialedIdx });

    // Determine where to insert new columns (after the source column)
    const insertions = [];

    // APPT % column (after APPT column if exists, otherwise after Contacts)
    if (apptIdx !== -1) {
        insertions.push({
            afterIdx: apptIdx,
            headerText: 'APPT %',
            calculate: (cells) => {
                const contacts = parseNum(cells[contactsIdx]?.innerText);
                const appt = parseNum(cells[apptIdx]?.innerText);
                return contacts > 0 ? (appt / contacts) * 100 : 0;
            },
            cssClass: 'insight-calc-col insight-appt-pct'
        });
    }

    // LXFER % column (after LXFER column if exists)
    if (lxferIdx !== -1) {
        insertions.push({
            afterIdx: lxferIdx,
            headerText: 'LXFER %',
            calculate: (cells) => {
                const contacts = parseNum(cells[contactsIdx]?.innerText);
                const lxfer = parseNum(cells[lxferIdx]?.innerText);
                return contacts > 0 ? (lxfer / contacts) * 100 : 0;
            },
            cssClass: 'insight-calc-col insight-lxfer-pct'
        });
    }

    if (insertions.length === 0) {
        console.log('[Insight Lens] No APPT or LXFER columns found to calculate percentages');
        return;
    }

    // Sort insertions by index descending so we insert from right to left
    // (prevents index shifting issues)
    insertions.sort((a, b) => b.afterIdx - a.afterIdx);

    // Inject header cells
    insertions.forEach(ins => {
        const newTh = document.createElement('th');
        newTh.innerText = ins.headerText;
        newTh.className = ins.cssClass;
        newTh.style.cssText = 'background: #fef3c7; color: #92400e; font-weight: 600; min-width: 80px; text-align: center;';
        
        const afterCell = headerCells[ins.afterIdx];
        if (afterCell && afterCell.nextSibling) {
            headerRow.insertBefore(newTh, afterCell.nextSibling);
        } else {
            headerRow.appendChild(newTh);
        }
    });

    // Inject data cells for each row
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length === 0) return;

        insertions.forEach(ins => {
            const value = ins.calculate(cells);
            const newTd = document.createElement('td');
            newTd.innerText = formatPct(value);
            newTd.className = ins.cssClass;
            
            // Color coding based on value
            let bgColor = '#fef9c3'; // Yellow default
            if (value >= 10) bgColor = '#bbf7d0'; // Green for good
            else if (value >= 5) bgColor = '#fef08a'; // Yellow
            else if (value > 0) bgColor = '#fed7aa'; // Orange for low
            
            newTd.style.cssText = `background: ${bgColor}; font-weight: 600; text-align: center;`;

            const afterCell = cells[ins.afterIdx];
            if (afterCell && afterCell.nextSibling) {
                row.insertBefore(newTd, afterCell.nextSibling);
            } else {
                row.appendChild(newTd);
            }
        });
    });

    columnsInjected = true;
    console.log('[Insight Lens] Injected calculated columns into table');
}

/**
 * Scan page for all data tables and process them
 */
function scanAndInject() {
    if (!INSIGHT_CONFIG.enabled) return;

    // Find all tables on the page
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        // Only process tables that look like data tables (have thead)
        if (table.querySelector('thead')) {
            processTable(table);
        }
    });

    // Update toggle button state
    updateToggleState();
}

// =============================================================================
// OVERLAY TOGGLE
// =============================================================================

/**
 * Create floating toggle button
 */
function createToggleButton() {
    // Check if already exists
    if (document.getElementById('insight-lens-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'insight-lens-toggle';
    btn.innerHTML = '📊 Insight Lens';
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        padding: 10px 16px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.2s;
    `;

    btn.addEventListener('mouseenter', () => {
        btn.style.background = '#1d4ed8';
        btn.style.transform = 'scale(1.05)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.background = INSIGHT_CONFIG.enabled ? '#2563eb' : '#6b7280';
        btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', toggleInsightLens);

    document.body.appendChild(btn);
}

/**
 * Toggle the insight lens on/off
 */
function toggleInsightLens() {
    INSIGHT_CONFIG.enabled = !INSIGHT_CONFIG.enabled;
    
    if (INSIGHT_CONFIG.enabled) {
        scanAndInject();
        showNotification('Insight Lens enabled - Calculated columns added');
    } else {
        // Remove injected columns
        removeInjectedColumns();
        showNotification('Insight Lens disabled');
    }
    
    updateToggleState();
}

/**
 * Update toggle button appearance
 */
function updateToggleState() {
    const btn = document.getElementById('insight-lens-toggle');
    if (!btn) return;

    if (INSIGHT_CONFIG.enabled && columnsInjected) {
        btn.innerHTML = '📊 Lens ON';
        btn.style.background = '#059669';
    } else if (INSIGHT_CONFIG.enabled) {
        btn.innerHTML = '📊 Insight Lens';
        btn.style.background = '#2563eb';
    } else {
        btn.innerHTML = '📊 Lens OFF';
        btn.style.background = '#6b7280';
    }
}

/**
 * Remove all injected columns
 */
function removeInjectedColumns() {
    document.querySelectorAll('.insight-calc-col').forEach(el => el.remove());
    columnsInjected = false;
}

/**
 * Show a brief notification
 */
function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        padding: 12px 20px;
        background: #1f2937;
        color: white;
        border-radius: 8px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notif.innerText = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// =============================================================================
// MUTATION OBSERVER - Handle dynamic Angular updates
// =============================================================================

let debounceTimer;
const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (INSIGHT_CONFIG.enabled) {
            scanAndInject();
        }
    }, 500);
});

// =============================================================================
// MESSAGE HANDLER - Communication with popup
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'toggle':
            toggleInsightLens();
            sendResponse({ status: 'ok', enabled: INSIGHT_CONFIG.enabled });
            break;
            
        case 'getStatus':
            sendResponse({ 
                status: 'ok', 
                enabled: INSIGHT_CONFIG.enabled, 
                columnsInjected 
            });
            break;
            
        case 'refresh':
            removeInjectedColumns();
            scanAndInject();
            sendResponse({ status: 'ok' });
            break;
            
        default:
            sendResponse({ status: 'error', message: 'Unknown action' });
    }
    return true;
});

// =============================================================================
// INITIALIZATION
// =============================================================================

console.log('[Insight Lens] Content script loaded');

// Create toggle button
createToggleButton();

// Initial scan
setTimeout(scanAndInject, 1000);

// Start observing for dynamic content
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
