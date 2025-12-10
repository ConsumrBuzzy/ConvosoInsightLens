Design Document: Convoso Insight Lens
Version: 1.0 (Draft) Target Platform: Google Chrome (Manifest V3) Target Host: Convoso Reporting Dashboard (Specific Report: FB Performance By Agent By List) Objective: To inject a visual intelligence layer over legacy AngularJS tables, transforming raw data into actionable, "human-readable" insights via in-page DOM manipulation.

1. Executive Summary
The current report presents critical KPI data in dense, unformatted tables. Users must manually compare rows to identify high-performing agents or wasteful lists. This extension automates that analysis by applying Heatmaps, Visual Volume Bars, and Status Indicators directly into the page. It transforms the page from a "spreadsheet" into a "dashboard."

2. Technical Architecture
2.1 Component Overview
Manifest V3 (manifest.json):

Permissions: scripting, activeTab, storage.

Host Permissions: *://*.convoso.com/*.

Content Script (content.js): The core engine.

Contains the "Scanner" (detects tables).

Contains the "Parser" (converts strings to numbers).

Contains the "Injector" (adds HTML/CSS).

Stylesheet (styles.css): Defines the visual language (heatmaps, progress bars, badges).

MutationObserver: Monitors the DOM for AngularJS changes. Since the report loads asynchronously, the script must wait for the generic .table-performance-data elements to populate before running.

2.2 Data Flow
Page Load: Extension injects content.js and styles.css.

Observation: MutationObserver watches for the appearance of <tbody> tags.

Identification: Script iterates through all tables, reading the <thead> to identify the Table Type (Summary vs. Detail).

Transformation: Script parses the specific columns for that Table Type and applies CSS classes or injects HTML bars.

3. Targeting Strategy (HTML Targets)
Since the tables lack unique IDs, we use Header Text Anchoring. We identify the table by its header, then target specific column indices (0-based index) within the rows.

Target A: "Lowest Success Lists" (Summary)
Identification: th contains text "Lowest Success Lists".

Data Columns:

List Name: Column 0 (td:nth-child(1))

% of Calls (Volume): Column 1 (td:nth-child(2))

Success Rate (KPI): Column 2 (td:nth-child(3))

Transformation Goal: Highlight waste. High Volume + Low Success = Red Visual Bar.

Target B: "Top Success Lists" (Summary)
Identification: th contains text "Top Success Lists".

Data Columns:

List Name: Column 0 (td:nth-child(1))

Contact Rate: Column 1 (td:nth-child(2))

Success Rate (KPI): Column 2 (td:nth-child(3))

Transformation Goal: Highlight opportunity. High Success = Green Visual Bar.

Target C: Agent/Campaign Details (The Big Tables)
Identification: th contains text "User" AND "Campaign".

Data Columns:

Dialed (Effort): Column 4 (Header: "Dialed")

Success Count: Column 7 (Header: "Success")

Call Success Rate (KPI): Column 8 (Header: "Call Success Rate")

Transformation Goal: Row-based Heatmap. Color the entire row based on the ratio of "Dialed" to "Success Rate."

4. Visual Logic & Business Rules
This section defines the logic the script uses to decide which color to paint a row.

4.1 The "Waste" Visualizer (Target A)
Concept: A horizontal bar chart injected behind the text in the cell.

Logic:

Parse % of Calls (e.g., "31.73%" -> 31.73).

Parse Success Rate (e.g., "3.47%" -> 3.47).

Condition: If % of Calls > 15%, inject a RED bar at 30% opacity. width = % of Calls.

User Story: "I can instantly see that the list taking up 30% of our time is failing."

4.2 The "Agent Heatmap" (Target C)
Concept: Apply a CSS class to the <tr> element.

Logic:

The Superstar (Green):

Condition: Call Success Rate > 20% OR Success Count > 10.

Class: .insight-row-superstar (Background: Light Mint, Border: Green).

The Grinder (Red):

Condition: Dialed > 150 AND Success Count < 1.

Class: .insight-row-grinder (Background: Light Red, Text: Dark Red).

Meaning: This agent is working hard (high dials) but failing (zero success).

The Ghost (Grey):

Condition: Dialed < 20.

Class: .insight-row-ghost (Opacity: 0.5).

Meaning: Not enough data to judge yet.

5. Detailed Implementation Specs
5.1 CSS Classes (styles.css)
CSS

/* Visualization Bars for Summary Tables */
.insight-bar-container {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
}
.insight-bar {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    z-index: -1;
    border-radius: 4px;
    opacity: 0.3;
}
.insight-bar-red { background-color: #ef4444; }
.insight-bar-green { background-color: #10b981; }

/* Heatmap Rows for Agent Tables */
tr.insight-row-superstar td {
    background-color: #d1fae5 !important; /* Mint Green */
    color: #064e3b !important;
    font-weight: 600;
}

tr.insight-row-grinder td {
    background-color: #fee2e2 !important; /* Light Red */
    color: #7f1d1d !important;
}

tr.insight-row-ghost {
    opacity: 0.5;
}
5.2 Parsing Logic (JavaScript Utility)
We need a robust parser because the HTML contains symbols (%) and formatting.

JavaScript

const Utilities = {
    // Converts "31.73%" or "1,200" to float
    parseNum: (str) => {
        if (!str) return 0;
        const clean = str.replace(/[%$,]/g, '').trim();
        return parseFloat(clean) || 0;
    },
    
    // Injects the bar visualization behind text
    injectBar: (tdElement, percentage, colorClass) => {
        if (tdElement.querySelector('.insight-bar')) return; // Prevent duplicates
        
        const originalText = tdElement.innerText;
        tdElement.innerHTML = `
            <div class="insight-bar-container">
                <div class="insight-bar ${colorClass}" style="width: ${percentage}%"></div>
                <span style="position:relative; z-index:1;">${originalText}</span>
            </div>
        `;
    }
};
6. Development Phases
Phase 1: Discovery (Done)

Analyzed HTML structure and identified anchors.

Defined visual requirements based on screenshots.

Phase 2: Scaffold

Create Manifest V3.

Set up MutationObserver to ensure script triggers only after Angular renders the tables.

Phase 3: The Summary Injector

Implement logic for "Lowest Success" and "Top Success" tables.

Test parsing of the "% of Calls" column.

Phase 4: The Agent Heatmap

Implement the loop for the large Agent Detail tables.

Apply the "Superstar" vs "Grinder" logic.

Phase 5: Refinement

Add a toggle in the Popup ("Human Mode: ON/OFF").

Handle edge cases (e.g., table pagination or sorting updates).