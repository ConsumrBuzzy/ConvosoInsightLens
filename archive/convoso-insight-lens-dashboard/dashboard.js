// dashboard.js - Main dashboard logic

let currentData = null;
let charts = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadData();
});

/**
 * Setup event listeners for dashboard interactions
 */
function setupEventListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.closest('.tab-btn').getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Action buttons
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    document.getElementById('closeBtn').addEventListener('click', () => {
        window.close();
    });
    document.getElementById('retryBtn').addEventListener('click', loadData);
}

/**
 * Load data from the active tab's content script
 */
function loadData() {
    showLoadingState();

    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            showErrorState('No active tab found.');
            return;
        }

        // Send message to content script to request data
        chrome.tabs.sendMessage(tabs[0].id, { action: 'requestData' }, (response) => {
            if (chrome.runtime.lastError) {
                showErrorState('Could not connect to the page. Make sure you are on a Convoso report page.');
                return;
            }

            if (response && response.status === 'data compiled') {
                currentData = response.data;
                renderDashboard();
                showMainContent();
            } else {
                showErrorState('Unable to extract data from the page.');
            }
        });
    });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update active tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Initialize charts if switching to charts tab
    if (tabName === 'charts') {
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }
}

/**
 * Render the entire dashboard with data
 */
function renderDashboard() {
    renderSummaryCards();
    renderAgentsTable();
    renderListsCards();
}

/**
 * Render summary metric cards
 */
function renderSummaryCards() {
    const agentDetails = currentData.agentDetails || [];
    const summaryLists = currentData.summaryLists || [];

    const totalAgents = agentDetails.length;
    const superstarCount = agentDetails.filter(a => a.insight === 'superstar').length;
    const grinderCount = agentDetails.filter(a => a.insight === 'grinder').length;
    const wasteCount = summaryLists.filter(l => l.isWaste).length;

    document.getElementById('totalAgents').textContent = totalAgents;
    document.getElementById('superstarCount').textContent = superstarCount;
    document.getElementById('grinderCount').textContent = grinderCount;
    document.getElementById('wasteCount').textContent = wasteCount;
}

/**
 * Render agents table
 */
function renderAgentsTable() {
    const tbody = document.getElementById('agentsTableBody');
    tbody.innerHTML = '';

    const agentDetails = currentData.agentDetails || [];

    agentDetails.forEach(agent => {
        const row = document.createElement('tr');

        // Extract key columns (with fallback names)
        const user = agent['User'] || agent['Agent'] || 'N/A';
        const dialed = agent['Dialed'] || '0';
        const success = agent['Success'] || '0';
        const successRate = agent['Call Success Rate'] || '0%';
        const insight = agent.insight || 'none';

        row.innerHTML = `
            <td><span class="insight-badge ${insight}">${insight.toUpperCase()}</span></td>
            <td>${escapeHtml(user)}</td>
            <td>${escapeHtml(dialed)}</td>
            <td>${escapeHtml(success)}</td>
            <td>${escapeHtml(successRate)}</td>
        `;

        tbody.appendChild(row);
    });

    if (agentDetails.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No agent data found</td></tr>';
    }
}

/**
 * Render list cards
 */
function renderListsCards() {
    const topListsContainer = document.getElementById('topListsContainer');
    const lowestListsContainer = document.getElementById('lowestListsContainer');

    topListsContainer.innerHTML = '';
    lowestListsContainer.innerHTML = '';

    const summaryLists = currentData.summaryLists || [];

    const topLists = summaryLists.filter(l => l.type === 'Top Success');
    const lowestLists = summaryLists.filter(l => l.type === 'Lowest Success');

    topLists.forEach(list => {
        topListsContainer.appendChild(createListCard(list, 'success'));
    });

    lowestLists.forEach(list => {
        lowestListsContainer.appendChild(createListCard(list, list.isWaste ? 'waste' : 'normal'));
    });

    if (topLists.length === 0) {
        topListsContainer.innerHTML = '<p style="color: #999; grid-column: 1/-1;">No top success lists found</p>';
    }

    if (lowestLists.length === 0) {
        lowestListsContainer.innerHTML = '<p style="color: #999; grid-column: 1/-1;">No lowest success lists found</p>';
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
                <span class="list-metric-label">Volume:</span>
                <span class="list-metric-value">${escapeHtml(list.volumeMetric)}</span>
            </div>
            <div class="list-metric">
                <span class="list-metric-label">Success:</span>
                <span class="list-metric-value">${escapeHtml(list.successMetric)}</span>
            </div>
        </div>
    `;

    return card;
}

/**
 * Initialize charts on the charts tab
 */
function initializeCharts() {
    if (charts.agentDistribution) return; // Already initialized

    const agentDetails = currentData.agentDetails || [];

    // Agent Distribution Chart
    const agentDistCtx = document.getElementById('agentDistributionChart');
    if (agentDistCtx) {
        const superstarCount = agentDetails.filter(a => a.insight === 'superstar').length;
        const grinderCount = agentDetails.filter(a => a.insight === 'grinder').length;
        const ghostCount = agentDetails.filter(a => a.insight === 'ghost').length;
        const normalCount = agentDetails.length - superstarCount - grinderCount - ghostCount;

        charts.agentDistribution = new Chart(agentDistCtx, {
            type: 'doughnut',
            data: {
                labels: ['Superstar', 'Grinder', 'Ghost', 'Normal'],
                datasets: [{
                    data: [superstarCount, grinderCount, ghostCount, normalCount],
                    backgroundColor: ['#10b981', '#ef4444', '#d1d5db', '#3b82f6'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Success Rate Distribution Chart
    const successRateCtx = document.getElementById('successRateChart');
    if (successRateCtx) {
        const successRates = agentDetails
            .map(a => parseFloat((a['Call Success Rate'] || '0%').replace('%', '')))
            .filter(r => !isNaN(r));

        const bins = [0, 10, 20, 30, 40, 50];
        const binCounts = bins.map((bin, i) => {
            const nextBin = bins[i + 1] || 100;
            return successRates.filter(r => r >= bin && r < nextBin).length;
        });

        charts.successRate = new Chart(successRateCtx, {
            type: 'bar',
            data: {
                labels: bins.map((b, i) => `${b}-${bins[i + 1] || '100'}%`),
                datasets: [{
                    label: 'Number of Agents',
                    data: binCounts,
                    backgroundColor: '#667eea',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Top Agents Chart
    const topAgentsCtx = document.getElementById('topAgentsChart');
    if (topAgentsCtx) {
        const topAgents = agentDetails
            .map(a => ({
                name: a['User'] || a['Agent'] || 'Unknown',
                rate: parseFloat((a['Call Success Rate'] || '0%').replace('%', ''))
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 10);

        charts.topAgents = new Chart(topAgentsCtx, {
            type: 'horizontalBar',
            data: {
                labels: topAgents.map(a => a.name),
                datasets: [{
                    label: 'Success Rate (%)',
                    data: topAgents.map(a => a.rate),
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        max: 100
                    }
                }
            }
        });
    }

    // List Performance Chart
    const listPerfCtx = document.getElementById('listPerformanceChart');
    if (listPerfCtx) {
        const summaryLists = currentData.summaryLists || [];
        const topLists = summaryLists
            .filter(l => l.type === 'Top Success')
            .slice(0, 10);

        charts.listPerformance = new Chart(listPerfCtx, {
            type: 'bar',
            data: {
                labels: topLists.map(l => l.listName.substring(0, 15)),
                datasets: [{
                    label: 'Success Rate (%)',
                    data: topLists.map(l => l.successValue),
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        max: 100
                    }
                }
            }
        });
    }
}

/**
 * Show/hide UI states
 */
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
}

function showMainContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
}

function showErrorState(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    if (message) {
        document.getElementById('errorMessage').textContent = message;
    }
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
