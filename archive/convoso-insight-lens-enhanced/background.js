// background.js (Service Worker)

// Listener for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateReport') {
        // Forward the request to the active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'generateReport' }, (response) => {
                    if (response && response.status === 'data compiled') {
                        const reportData = response.data;
                        const csvContent = generateCSV(reportData);
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        
                        // Trigger download
                        chrome.downloads.download({
                            url: url,
                            filename: \`convoso-insight-report-\${new Date().toISOString().slice(0, 10)}.csv\`,
                            saveAs: true
                        });

                        sendResponse({ status: 'download initiated' });
                    } else {
                        sendResponse({ status: 'error', message: 'Could not compile data from content script.' });
                    }
                });
            } else {
                sendResponse({ status: 'error', message: 'No active tab found.' });
            }
        });
        // Return true to indicate that sendResponse will be called asynchronously
        return true; 
    }
});

/**
 * Converts the extracted JSON data into a comprehensive CSV string.
 * @param {object} data - The compiled report data.
 * @returns {string} The CSV content.
 */
function generateCSV(data) {
    let csv = '';

    // --- Section 1: Summary Lists ---
    csv += "--- Summary Lists ---\n";
    if (data.summaryLists.length > 0) {
        const listHeaders = ["Type", "List Name", "Volume Metric", "Success Metric", "Volume Value", "Success Value", "Insight"];
        csv += listHeaders.join(',') + '\n';
        data.summaryLists.forEach(item => {
            const insight = item.isWaste ? 'Waste' : 'Normal';
            csv += [
                item.type,
                `"\${item.listName.replace(/"/g, '""')}"`, // Handle quotes in list names
                item.volumeMetric,
                item.successMetric,
                item.volumeValue,
                item.successValue,
                insight
            ].join(',') + '\n';
        });
    } else {
        csv += "No summary list data found.\n";
    }
    csv += "\n";

    // --- Section 2: Agent Details ---
    csv += "--- Agent Details ---\n";
    if (data.agentDetails.length > 0) {
        // Dynamically get all unique headers from all agent rows
        const allKeys = new Set();
        data.agentDetails.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });
        
        const agentHeaders = Array.from(allKeys);
        csv += agentHeaders.join(',') + '\n';

        data.agentDetails.forEach(row => {
            const rowValues = agentHeaders.map(header => {
                let value = row[header] || '';
                // Escape quotes and wrap in quotes if value contains comma or quote
                if (typeof value === 'string') {
                    value = value.replace(/"/g, '""');
                    if (value.includes(',') || value.includes('\\n')) {
                        value = `"\${value}"`;
                    }
                }
                return value;
            });
            csv += rowValues.join(',') + '\n';
        });
    } else {
        csv += "No agent detail data found.\n";
    }
    
    return csv;
}
