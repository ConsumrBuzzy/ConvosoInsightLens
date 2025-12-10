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
        case 'openOverlay':
            showOverlay();
            sendResponse({ status: 'ok' });
            break;
            
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
// OVERLAY DASHBOARD
// =============================================================================

let overlayVisible = false;

/**
 * Create the overlay dashboard
 */
function createOverlayDashboard() {
    if (document.getElementById('insight-lens-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'insight-lens-overlay';
    overlay.innerHTML = `
        <div class="ils-overlay-backdrop"></div>
        <div class="ils-overlay-panel">
            <div class="ils-header">
                <h1>📊 Convoso Insight Lens</h1>
                <div class="ils-header-actions">
                    <button id="ils-refresh-btn" class="ils-btn">↻ Refresh</button>
                    <button id="ils-export-btn" class="ils-btn">📥 Export CSV</button>
                    <button id="ils-close-btn" class="ils-btn ils-btn-close">✕</button>
                </div>
            </div>
            <div class="ils-content">
                <div class="ils-loading">Loading data...</div>
                <div class="ils-table-container" style="display:none;">
                    <table class="ils-table">
                        <thead id="ils-table-head"></thead>
                        <tbody id="ils-table-body"></tbody>
                    </table>
                </div>
            </div>
            <div class="ils-footer">
                <span><strong>APPT %</strong> = APPT ÷ Contacts</span>
                <span><strong>LXFER %</strong> = LXFER ÷ Contacts</span>
                <span><strong>Contact %</strong> = Contacts ÷ Dialed</span>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('ils-close-btn').addEventListener('click', hideOverlay);
    document.getElementById('ils-refresh-btn').addEventListener('click', () => populateOverlay());
    document.getElementById('ils-export-btn').addEventListener('click', exportCSV);
    document.querySelector('.ils-overlay-backdrop').addEventListener('click', hideOverlay);

    // Inject styles
    injectOverlayStyles();
}

/**
 * Inject overlay CSS
 */
function injectOverlayStyles() {
    if (document.getElementById('ils-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'ils-overlay-styles';
    style.textContent = `
        #insight-lens-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #insight-lens-overlay.visible {
            display: block;
        }
        .ils-overlay-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
        }
        .ils-overlay-panel {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .ils-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            color: white;
        }
        .ils-header h1 {
            font-size: 20px;
            margin: 0;
        }
        .ils-header-actions {
            display: flex;
            gap: 8px;
        }
        .ils-btn {
            padding: 8px 14px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background 0.2s;
        }
        .ils-btn:hover {
            background: rgba(255,255,255,0.3);
        }
        .ils-btn-close {
            background: #ef4444;
            font-size: 16px;
            padding: 8px 12px;
        }
        .ils-btn-close:hover {
            background: #dc2626;
        }
        .ils-content {
            flex: 1;
            overflow: auto;
            padding: 0;
        }
        .ils-loading {
            text-align: center;
            padding: 60px;
            color: #6b7280;
            font-size: 16px;
        }
        .ils-table-container {
            overflow: auto;
            height: 100%;
        }
        .ils-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .ils-table th, .ils-table td {
            padding: 8px 10px;
            border: 1px solid #e5e7eb;
            text-align: left;
            white-space: nowrap;
        }
        .ils-table thead th {
            background: #f3f4f6;
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .ils-table .ils-list-header {
            background: #dbeafe;
            color: #1e40af;
            text-align: center;
            font-weight: 700;
            border-left: 3px solid #3b82f6;
        }
        .ils-table .ils-metric-header {
            font-size: 10px;
            color: #6b7280;
            background: #f9fafb;
        }
        .ils-table .ils-agent-cell {
            font-weight: 600;
            background: #fafafa;
            position: sticky;
            left: 0;
            z-index: 5;
            border-right: 2px solid #d1d5db;
        }
        .ils-table .ils-divider {
            border-left: 3px solid #3b82f6;
        }
        .ils-table .ils-pct {
            background: #fef9c3;
            font-weight: 600;
            text-align: right;
        }
        .ils-table .ils-pct-good {
            background: #bbf7d0;
            color: #166534;
        }
        .ils-table .ils-pct-bad {
            background: #fecaca;
            color: #991b1b;
        }
        .ils-table tbody tr:hover td {
            background: #f0f9ff;
        }
        .ils-table tbody tr:hover .ils-agent-cell {
            background: #e0f2fe;
        }
        .ils-footer {
            display: flex;
            gap: 24px;
            padding: 12px 24px;
            background: #f8fafc;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #64748b;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show the overlay dashboard
 */
function showOverlay() {
    createOverlayDashboard();
    document.getElementById('insight-lens-overlay').classList.add('visible');
    overlayVisible = true;
    populateOverlay();
}

/**
 * Hide the overlay dashboard
 */
function hideOverlay() {
    const overlay = document.getElementById('insight-lens-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
    overlayVisible = false;
}

/**
 * Toggle overlay visibility
 */
function toggleOverlay() {
    if (overlayVisible) {
        hideOverlay();
    } else {
        showOverlay();
    }
}

/**
 * Populate the overlay with data
 */
function populateOverlay() {
    const loading = document.querySelector('.ils-loading');
    const tableContainer = document.querySelector('.ils-table-container');
    const thead = document.getElementById('ils-table-head');
    const tbody = document.getElementById('ils-table-body');

    loading.style.display = 'block';
    tableContainer.style.display = 'none';

    // Extract data from all tables on the page
    const data = extractAllTableData();
    
    if (data.agents.size === 0) {
        loading.textContent = 'No agent data found. Make sure a report is loaded.';
        return;
    }

    // Build pivot table
    const lists = Array.from(data.lists).sort();
    const metrics = ['Dialed', 'Contacts', 'Contact%', 'APPT', 'APPT%', 'LXFER', 'LXFER%'];

    // Header row 1: List names
    let header1 = '<tr><th rowspan="2" class="ils-agent-cell">Agent</th>';
    header1 += `<th colspan="${metrics.length}" class="ils-list-header">TOTALS</th>`;
    lists.forEach(list => {
        const shortName = list.length > 25 ? list.substring(0, 25) + '...' : list;
        header1 += `<th colspan="${metrics.length}" class="ils-list-header">${escapeHtml(shortName)}</th>`;
    });
    header1 += '</tr>';

    // Header row 2: Metric names
    let header2 = '<tr>';
    const metricHeaders = metrics.map(m => `<th class="ils-metric-header">${m}</th>`).join('');
    header2 += metricHeaders; // Totals
    lists.forEach(() => {
        header2 += metricHeaders;
    });
    header2 += '</tr>';

    thead.innerHTML = header1 + header2;

    // Data rows
    let bodyHtml = '';
    const sortedAgents = Array.from(data.agents.entries())
        .sort((a, b) => b[1].totals.dialed - a[1].totals.dialed);

    sortedAgents.forEach(([agentName, agentData]) => {
        bodyHtml += '<tr>';
        bodyHtml += `<td class="ils-agent-cell">${escapeHtml(agentName)}</td>`;
        
        // Totals
        bodyHtml += renderMetricCells(agentData.totals, false);

        // Each list
        lists.forEach(listName => {
            const listData = agentData.lists.get(listName) || { dialed: 0, contacts: 0, appt: 0, lxfer: 0 };
            bodyHtml += renderMetricCells(listData, true);
        });

        bodyHtml += '</tr>';
    });

    tbody.innerHTML = bodyHtml;

    loading.style.display = 'none';
    tableContainer.style.display = 'block';
}

/**
 * Render metric cells for a data object
 */
function renderMetricCells(data, addDivider) {
    const contactPct = data.dialed > 0 ? (data.contacts / data.dialed) * 100 : 0;
    const apptPct = data.contacts > 0 ? (data.appt / data.contacts) * 100 : 0;
    const lxferPct = data.contacts > 0 ? (data.lxfer / data.contacts) * 100 : 0;

    const divider = addDivider ? 'ils-divider' : '';
    const apptClass = apptPct >= 10 ? 'ils-pct-good' : (apptPct < 2 && data.contacts > 0 ? 'ils-pct-bad' : '');
    const lxferClass = lxferPct >= 10 ? 'ils-pct-good' : (lxferPct < 2 && data.contacts > 0 ? 'ils-pct-bad' : '');

    return `
        <td class="${divider}">${data.dialed}</td>
        <td>${data.contacts}</td>
        <td class="ils-pct">${contactPct.toFixed(1)}%</td>
        <td>${data.appt}</td>
        <td class="ils-pct ${apptClass}">${apptPct.toFixed(1)}%</td>
        <td>${data.lxfer}</td>
        <td class="ils-pct ${lxferClass}">${lxferPct.toFixed(1)}%</td>
    `;
}

/**
 * Extract all table data from the page
 */
function extractAllTableData() {
    const agents = new Map();
    const lists = new Set();

    document.querySelectorAll('table').forEach(table => {
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;

        const headerCells = Array.from(headerRow.querySelectorAll('th'));
        const headers = headerCells.map(th => th.innerText.trim().toLowerCase());

        // Find column indices
        const userIdx = headers.findIndex(h => h === 'user' || h === 'agent');
        const listIdx = headers.findIndex(h => h.includes('list'));
        const dialedIdx = findColumnIndex(headers, ['dialed']);
        const contactsIdx = findColumnIndex(headers, ['contacts', 'contact']);
        const apptIdx = findColumnIndex(headers, ['appt', 'appointment']);
        const lxferIdx = findColumnIndex(headers, ['lxfer', 'live transfer']);

        if (userIdx === -1) return;

        table.querySelectorAll('tbody tr').forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length < 3) return;

            const agentName = cells[userIdx]?.innerText.trim() || 'Unknown';
            const listName = listIdx !== -1 ? (cells[listIdx]?.innerText.trim() || 'Default') : 'All';
            
            lists.add(listName);

            if (!agents.has(agentName)) {
                agents.set(agentName, {
                    lists: new Map(),
                    totals: { dialed: 0, contacts: 0, appt: 0, lxfer: 0 }
                });
            }

            const agentData = agents.get(agentName);
            const dialed = dialedIdx !== -1 ? parseNum(cells[dialedIdx]?.innerText) : 0;
            const contacts = contactsIdx !== -1 ? parseNum(cells[contactsIdx]?.innerText) : 0;
            const appt = apptIdx !== -1 ? parseNum(cells[apptIdx]?.innerText) : 0;
            const lxfer = lxferIdx !== -1 ? parseNum(cells[lxferIdx]?.innerText) : 0;

            // Aggregate per list
            if (!agentData.lists.has(listName)) {
                agentData.lists.set(listName, { dialed: 0, contacts: 0, appt: 0, lxfer: 0 });
            }
            const listData = agentData.lists.get(listName);
            listData.dialed += dialed;
            listData.contacts += contacts;
            listData.appt += appt;
            listData.lxfer += lxfer;

            // Aggregate totals
            agentData.totals.dialed += dialed;
            agentData.totals.contacts += contacts;
            agentData.totals.appt += appt;
            agentData.totals.lxfer += lxfer;
        });
    });

    return { agents, lists };
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Export data to CSV
 */
function exportCSV() {
    const data = extractAllTableData();
    const lists = Array.from(data.lists).sort();
    
    let csv = 'Agent,List,Dialed,Contacts,Contact%,APPT,APPT%,LXFER,LXFER%\n';
    
    data.agents.forEach((agentData, agentName) => {
        agentData.lists.forEach((listData, listName) => {
            const contactPct = listData.dialed > 0 ? (listData.contacts / listData.dialed) * 100 : 0;
            const apptPct = listData.contacts > 0 ? (listData.appt / listData.contacts) * 100 : 0;
            const lxferPct = listData.contacts > 0 ? (listData.lxfer / listData.contacts) * 100 : 0;
            
            csv += `"${agentName}","${listName}",${listData.dialed},${listData.contacts},${contactPct.toFixed(2)}%,${listData.appt},${apptPct.toFixed(2)}%,${listData.lxfer},${lxferPct.toFixed(2)}%\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `convoso-insight-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('CSV exported!');
}

// =============================================================================
// INITIALIZATION
// =============================================================================

console.log('[Insight Lens] Content script loaded');

// Create toggle button (now opens overlay)
createToggleButton();

// Update toggle button to open overlay instead
document.getElementById('insight-lens-toggle').removeEventListener('click', toggleInsightLens);
document.getElementById('insight-lens-toggle').addEventListener('click', toggleOverlay);
document.getElementById('insight-lens-toggle').innerHTML = '📊 Open Dashboard';

// Initial scan for inline columns
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
