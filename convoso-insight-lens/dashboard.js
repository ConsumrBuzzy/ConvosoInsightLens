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
 * Load data from active Convoso tab
 */
function loadData() {
    showLoading();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Find a Convoso tab (might not be the popup opener)
        chrome.tabs.query({ url: '*://*.convoso.com/*' }, (convosoTabs) => {
            if (!convosoTabs || convosoTabs.length === 0) {
                showError('No Convoso tab found. Please open a Convoso report page.');
                return;
            }

            const targetTab = convosoTabs[0];
            
            chrome.tabs.sendMessage(targetTab.id, { action: 'requestData' }, (response) => {
                if (chrome.runtime.lastError) {
                    showError('Could not connect to Convoso page. Try refreshing the report.');
                    console.error(chrome.runtime.lastError);
                    return;
                }

                if (response && response.status === 'ok' && response.data) {
                    currentData = response.data;
                    renderDashboard();
                    showContent();
                } else {
                    showError('No report data found. Make sure a report is loaded.');
                }
            });
        });
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
    renderAgentsTable();
    renderKPIsTable();
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
 * Render calculated KPIs table
 */
function renderKPIsTable() {
    const tbody = document.getElementById('kpisTableBody');
    tbody.innerHTML = '';

    const agents = currentData.agentDetails || [];

    if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#999;padding:40px;">No data available</td></tr>';
        return;
    }

    agents.forEach(agent => {
        const row = document.createElement('tr');
        
        const user = agent.raw?.User || agent.raw?.Agent || 'N/A';
        const p = agent.parsed || {};
        const c = agent.calculated || {};

        row.innerHTML = `
            <td>${escapeHtml(user)}</td>
            <td>${(p.dialed || 0).toLocaleString()}</td>
            <td>${(p.contacts || 0).toLocaleString()}</td>
            <td class="calculated">${formatPercent(c.contactRate)}</td>
            <td>${(p.appt || 0).toLocaleString()}</td>
            <td class="calculated">${formatPercent(c.apptPercentOfCalls)}</td>
            <td class="calculated">${formatPercent(c.apptPercentOfContacts)}</td>
            <td>${(p.lxfer || 0).toLocaleString()}</td>
            <td class="calculated">${formatPercent(c.lxferPercentOfCalls)}</td>
            <td class="calculated">${formatPercent(c.lxferPercentOfContacts)}</td>
        `;

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

    // Agent search
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
