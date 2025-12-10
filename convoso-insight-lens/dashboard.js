/**
 * Convoso Insight Lens - Dashboard Script
 * Displays comprehensive analytics from extracted Convoso data.
 */

// =============================================================================
// STATE
// =============================================================================

let currentData = null;
let charts = {};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadData();
});

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load data from chrome.storage (set by popup before opening dashboard)
 */
function loadData() {
    showLoading();

    chrome.storage.local.get('dashboardData', (result) => {
        if (result.dashboardData) {
            currentData = result.dashboardData;
            renderDashboard();
            showContent();
        } else {
            // Fallback: try to get data directly from a Convoso tab
            chrome.tabs.query({ url: '*://*.convoso.com/*' }, (convosoTabs) => {
                if (!convosoTabs || convosoTabs.length === 0) {
                    showError('No data available. Open a Convoso report and click "Open Dashboard" from the popup.');
                    return;
                }

                chrome.tabs.sendMessage(convosoTabs[0].id, { action: 'requestData' }, (response) => {
                    if (chrome.runtime.lastError || !response || response.status !== 'ok') {
                        showError('Could not load data. Open a Convoso report and use the popup to open the dashboard.');
                        return;
                    }
                    currentData = response.data;
                    renderDashboard();
                    showContent();
                });
            });
        }
    });
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
}

function showContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Main render function - populates all dashboard sections
 */
function renderDashboard() {
    if (!currentData) return;

    // Update header info
    document.getElementById('reportInfo').textContent = 
        `Report: ${currentData.reportTitle || 'Convoso Report'} | Updated: ${new Date(currentData.timestamp).toLocaleString()}`;

    // Render sections
    renderSummaryCards();
    renderPivotTable();  // New primary view
    renderAgentsTable();
    renderListsSection();
}

/**
 * Render summary cards with counts
 */
function renderSummaryCards() {
    const summary = currentData.summary || {};
    
    document.getElementById('totalAgents').textContent = summary.totalAgents || 0;
    document.getElementById('superstarCount').textContent = summary.superstars || 0;
    document.getElementById('grinderCount').textContent = summary.grinders || 0;
    document.getElementById('ghostCount').textContent = summary.ghosts || 0;
    document.getElementById('wasteCount').textContent = summary.wasteLists || 0;
}

/**
 * Render agents performance table
 */
function renderAgentsTable(filter = 'all', searchTerm = '') {
    const tbody = document.getElementById('agentsTableBody');
    tbody.innerHTML = '';

    let agents = currentData.agentDetails || [];

    // Apply insight filter
    if (filter !== 'all') {
        agents = agents.filter(a => a.insight === filter);
    }

    // Apply search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        agents = agents.filter(a => {
            const user = (a.raw?.User || a.raw?.Agent || '').toLowerCase();
            const campaign = (a.raw?.Campaign || '').toLowerCase();
            return user.includes(term) || campaign.includes(term);
        });
    }

    if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:40px;">No agents found</td></tr>';
        return;
    }

    agents.forEach(agent => {
        const row = document.createElement('tr');
        
        const user = agent.raw?.User || agent.raw?.Agent || 'N/A';
        const campaign = agent.raw?.Campaign || 'N/A';
        const dialed = agent.parsed?.dialed || 0;
        const contacts = agent.parsed?.contacts || 0;
        const success = agent.parsed?.successCount || 0;
        const successRate = agent.parsed?.successRate || 0;

        row.innerHTML = `
            <td><span class="insight-badge ${agent.insight}">${agent.insight.toUpperCase()}</span></td>
            <td>${escapeHtml(user)}</td>
            <td>${escapeHtml(campaign)}</td>
            <td>${dialed.toLocaleString()}</td>
            <td>${contacts.toLocaleString()}</td>
            <td>${success.toLocaleString()}</td>
            <td>${successRate.toFixed(2)}%</td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Render pivot table: Agent (rows) × List (columns) with conversion metrics
 */
function renderPivotTable(searchTerm = '') {
    const thead = document.getElementById('pivotTableHead');
    const tbody = document.getElementById('pivotTableBody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const agents = currentData.agentDetails || [];
    if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#999;padding:40px;">No data available</td></tr>';
        return;
    }

    // Step 1: Aggregate data by Agent → List
    const agentMap = new Map(); // agentName -> { lists: Map<listName, metrics>, totals: {...} }
    const allLists = new Set();

    agents.forEach(record => {
        const agentName = record.raw?.User || record.raw?.Agent || 'Unknown';
        const listName = record.raw?.List || record.raw?.['List Name'] || 'Default';
        
        allLists.add(listName);

        if (!agentMap.has(agentName)) {
            agentMap.set(agentName, { 
                lists: new Map(),
                totals: { dialed: 0, contacts: 0, success: 0, appt: 0, lxfer: 0 }
            });
        }

        const agentData = agentMap.get(agentName);
        const p = record.parsed || {};

        // Aggregate per list
        if (!agentData.lists.has(listName)) {
            agentData.lists.set(listName, { dialed: 0, contacts: 0, success: 0, appt: 0, lxfer: 0 });
        }
        const listData = agentData.lists.get(listName);
        listData.dialed += p.dialed || 0;
        listData.contacts += p.contacts || 0;
        listData.success += p.successCount || 0;
        listData.appt += p.appt || 0;
        listData.lxfer += p.lxfer || 0;

        // Aggregate totals
        agentData.totals.dialed += p.dialed || 0;
        agentData.totals.contacts += p.contacts || 0;
        agentData.totals.success += p.successCount || 0;
        agentData.totals.appt += p.appt || 0;
        agentData.totals.lxfer += p.lxfer || 0;
    });

    const listNames = Array.from(allLists).sort();
    const metrics = ['Dialed', 'Contacts', 'Contact%', 'APPT', 'APPT%', 'LXFER', 'LXFER%', 'Success', 'Success%'];

    // Step 2: Build header rows
    // Row 1: List names (spanning multiple metric columns)
    const headerRow1 = document.createElement('tr');
    headerRow1.innerHTML = `<th class="agent-header" rowspan="2">Agent</th><th colspan="${metrics.length}" class="list-group">TOTALS</th>`;
    listNames.forEach(list => {
        headerRow1.innerHTML += `<th colspan="${metrics.length}" class="list-group">${escapeHtml(list.substring(0, 20))}</th>`;
    });
    thead.appendChild(headerRow1);

    // Row 2: Metric names
    const headerRow2 = document.createElement('tr');
    const metricsHtml = metrics.map(m => `<th class="metric-header">${m}</th>`).join('');
    headerRow2.innerHTML = metricsHtml; // Totals
    listNames.forEach(() => {
        headerRow2.innerHTML += metricsHtml;
    });
    thead.appendChild(headerRow2);

    // Step 3: Build data rows
    const sortedAgents = Array.from(agentMap.entries())
        .filter(([name]) => !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b[1].totals.dialed - a[1].totals.dialed); // Sort by total dials

    sortedAgents.forEach(([agentName, agentData]) => {
        const row = document.createElement('tr');
        row.className = 'agent-row';

        // Agent name cell (sticky)
        row.innerHTML = `<td class="agent-cell">${escapeHtml(agentName)}</td>`;

        // Helper to render metrics for a data object
        const renderMetrics = (data, addDivider = false) => {
            const contactPct = data.dialed > 0 ? (data.contacts / data.dialed) * 100 : 0;
            const apptPct = data.contacts > 0 ? (data.appt / data.contacts) * 100 : 0;
            const lxferPct = data.contacts > 0 ? (data.lxfer / data.contacts) * 100 : 0;
            const successPct = data.contacts > 0 ? (data.success / data.contacts) * 100 : 0;
            const dividerClass = addDivider ? 'list-divider' : '';

            return `
                <td class="metric-value ${dividerClass}">${data.dialed}</td>
                <td class="metric-value">${data.contacts}</td>
                <td class="metric-value highlight">${contactPct.toFixed(1)}%</td>
                <td class="metric-value">${data.appt}</td>
                <td class="metric-value highlight ${apptPct > 5 ? 'good' : ''}">${apptPct.toFixed(1)}%</td>
                <td class="metric-value">${data.lxfer}</td>
                <td class="metric-value highlight ${lxferPct > 5 ? 'good' : ''}">${lxferPct.toFixed(1)}%</td>
                <td class="metric-value">${data.success}</td>
                <td class="metric-value highlight ${successPct > 10 ? 'good' : ''}">${successPct.toFixed(1)}%</td>
            `;
        };

        // Totals column (no divider on first group)
        row.innerHTML += renderMetrics(agentData.totals, false);

        // Each list column (with divider)
        listNames.forEach(listName => {
            const listData = agentData.lists.get(listName) || { dialed: 0, contacts: 0, success: 0, appt: 0, lxfer: 0 };
            row.innerHTML += renderMetrics(listData, true);
        });

        tbody.appendChild(row);
    });
}

/**
 * Render lists section (top and waste lists)
 */
function renderListsSection() {
    const topContainer = document.getElementById('topListsContainer');
    const wasteContainer = document.getElementById('wasteListsContainer');

    topContainer.innerHTML = '';
    wasteContainer.innerHTML = '';

    const lists = currentData.summaryLists || [];
    const topLists = lists.filter(l => l.type === 'Top Success');
    const wasteLists = lists.filter(l => l.type === 'Lowest Success');

    if (topLists.length === 0) {
        topContainer.innerHTML = '<p style="color:#999;">No top lists found</p>';
    } else {
        topLists.forEach(list => {
            topContainer.appendChild(createListCard(list, 'top'));
        });
    }

    if (wasteLists.length === 0) {
        wasteContainer.innerHTML = '<p style="color:#999;">No waste lists found</p>';
    } else {
        wasteLists.forEach(list => {
            wasteContainer.appendChild(createListCard(list, list.isWaste ? 'waste' : ''));
        });
    }
}

/**
 * Create a list card element
 */
function createListCard(list, type) {
    const card = document.createElement('div');
    card.className = `list-card ${type}`;
    
    card.innerHTML = `
        <div class="list-name">${escapeHtml(list.listName)}</div>
        <div class="list-metrics">
            <div class="list-metric">
                <span>Volume:</span>
                <span class="list-metric-value">${escapeHtml(list.volumeMetric)}</span>
            </div>
            <div class="list-metric">
                <span>Success:</span>
                <span class="list-metric-value">${escapeHtml(list.successMetric)}</span>
            </div>
        </div>
    `;

    return card;
}

// =============================================================================
// CHARTS
// =============================================================================

/**
 * Initialize all charts (called when Charts tab is opened)
 */
function initializeCharts() {
    if (!currentData || charts.initialized) return;

    const agents = currentData.agentDetails || [];
    
    // Distribution Chart (Doughnut)
    const distCtx = document.getElementById('distributionChart');
    if (distCtx) {
        const counts = {
            superstar: agents.filter(a => a.insight === 'superstar').length,
            grinder: agents.filter(a => a.insight === 'grinder').length,
            ghost: agents.filter(a => a.insight === 'ghost').length,
            none: agents.filter(a => a.insight === 'none').length
        };

        charts.distribution = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['Superstars', 'Grinders', 'Ghosts', 'Normal'],
                datasets: [{
                    data: [counts.superstar, counts.grinder, counts.ghost, counts.none],
                    backgroundColor: ['#10b981', '#ef4444', '#9ca3af', '#3b82f6'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Top Agents Chart (Horizontal Bar)
    const topCtx = document.getElementById('topAgentsChart');
    if (topCtx) {
        const topAgents = agents
            .filter(a => a.parsed?.successRate > 0)
            .sort((a, b) => (b.parsed?.successRate || 0) - (a.parsed?.successRate || 0))
            .slice(0, 10);

        charts.topAgents = new Chart(topCtx, {
            type: 'bar',
            data: {
                labels: topAgents.map(a => (a.raw?.User || a.raw?.Agent || 'Unknown').substring(0, 15)),
                datasets: [{
                    label: 'Success Rate %',
                    data: topAgents.map(a => a.parsed?.successRate || 0),
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { max: 100 }
                }
            }
        });
    }

    // APPT % Chart (Bar)
    const apptCtx = document.getElementById('apptChart');
    if (apptCtx) {
        const apptAgents = agents
            .filter(a => a.calculated?.apptPercentOfContacts > 0)
            .sort((a, b) => (b.calculated?.apptPercentOfContacts || 0) - (a.calculated?.apptPercentOfContacts || 0))
            .slice(0, 10);

        charts.appt = new Chart(apptCtx, {
            type: 'bar',
            data: {
                labels: apptAgents.map(a => (a.raw?.User || 'Unknown').substring(0, 12)),
                datasets: [{
                    label: 'APPT % of Contacts',
                    data: apptAgents.map(a => a.calculated?.apptPercentOfContacts || 0),
                    backgroundColor: '#667eea',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // Effort vs Results (Scatter)
    const effortCtx = document.getElementById('effortChart');
    if (effortCtx) {
        const scatterData = agents
            .filter(a => a.parsed?.dialed > 0)
            .map(a => ({
                x: a.parsed?.dialed || 0,
                y: a.parsed?.successRate || 0
            }));

        charts.effort = new Chart(effortCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Agent Performance',
                    data: scatterData,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { title: { display: true, text: 'Dials' } },
                    y: { title: { display: true, text: 'Success Rate %' }, max: 100 }
                }
            }
        });
    }

    charts.initialized = true;
}

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Export data to CSV
 */
function exportToCSV() {
    if (!currentData) return;

    const agents = currentData.agentDetails || [];
    
    // Build CSV header
    const headers = [
        'Insight', 'User', 'Campaign', 'Dialed', 'Contacts', 'Success', 'Success Rate',
        'Contact Rate', 'APPT', 'APPT % Calls', 'APPT % Contacts',
        'LXFER', 'LXFER % Calls', 'LXFER % Contacts'
    ];

    // Build CSV rows
    const rows = agents.map(a => {
        const p = a.parsed || {};
        const c = a.calculated || {};
        return [
            a.insight,
            a.raw?.User || a.raw?.Agent || '',
            a.raw?.Campaign || '',
            p.dialed || 0,
            p.contacts || 0,
            p.successCount || 0,
            (p.successRate || 0).toFixed(2),
            (c.contactRate || 0).toFixed(2),
            p.appt || 0,
            (c.apptPercentOfCalls || 0).toFixed(2),
            (c.apptPercentOfContacts || 0).toFixed(2),
            p.lxfer || 0,
            (c.lxferPercentOfCalls || 0).toFixed(2),
            (c.lxferPercentOfContacts || 0).toFixed(2)
        ].map(v => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `convoso-insights-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    
    // Retry button
    document.getElementById('retryBtn').addEventListener('click', loadData);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Pivot table search
    document.getElementById('pivotSearch').addEventListener('input', (e) => {
        renderPivotTable(e.target.value);
    });

    // Agent search (raw data tab)
    document.getElementById('agentSearch').addEventListener('input', (e) => {
        const filter = document.getElementById('insightFilter').value;
        renderAgentsTable(filter, e.target.value);
    });

    // Insight filter
    document.getElementById('insightFilter').addEventListener('change', (e) => {
        const search = document.getElementById('agentSearch').value;
        renderAgentsTable(e.target.value, search);
    });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tabName}-tab`);
    });

    // Initialize charts on first view
    if (tabName === 'charts') {
        setTimeout(initializeCharts, 100);
    }
}

// =============================================================================
// UTILITIES
// =============================================================================

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

function formatPercent(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) return '0.00%';
    return num.toFixed(decimals) + '%';
}
