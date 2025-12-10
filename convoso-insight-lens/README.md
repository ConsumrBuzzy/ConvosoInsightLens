# Convoso Insight Lens

A Chrome Extension that transforms Convoso reports into human-readable dashboards with calculated KPIs, visual heatmaps, and actionable insights.

## Features

- **Visual Heatmaps**: Automatically color-codes agent rows based on performance
- **Calculated KPIs**: APPT %, LXFER %, Contact Rate, and more
- **Waste Detection**: Identifies low-performing lists consuming resources
- **Interactive Dashboard**: Full analytics view with charts and filtering
- **CSV Export**: Export processed data for further analysis

## Installation

### Step 1: Download Chart.js

The extension requires Chart.js to be bundled locally (Manifest V3 CSP requirement).

1. Download Chart.js v4.4.1 UMD build:
   ```
   https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
   ```

2. Save the file as `lib/chart.min.js` in the extension folder.

### Step 2: Add Icons

Create PNG icons in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can use any icon generator or the provided placeholder.

### Step 3: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `convoso-insight-lens` folder

## Usage

1. Navigate to a Convoso report page (e.g., "FB Performance By Agent By List")
2. Click the extension icon in Chrome toolbar
3. The page will automatically highlight:
   - **Green rows**: Superstars (high success rate)
   - **Red rows**: Grinders (high dials, no success)
   - **Faded rows**: Ghosts (insufficient data)
4. Click **Open Full Dashboard** for detailed analytics

## Configuration

Adjustable thresholds in the popup:
- **Waste Threshold**: % of calls above which a low-success list is flagged
- **Superstar Rate**: Success rate threshold for superstar status
- **Superstar Count**: Alternative success count threshold
- **Grinder Dials**: Minimum dials for grinder classification
- **Ghost Dials**: Maximum dials below which agent is a "ghost"

## Calculated Metrics

The dashboard computes these KPIs from raw Convoso data:

| Metric | Formula |
|--------|---------|
| Contact Rate | (Contacts / Dialed) × 100 |
| APPT % of Calls | (APPT / Dialed) × 100 |
| APPT % of Contacts | (APPT / Contacts) × 100 |
| LXFER % of Calls | (LXFER / Dialed) × 100 |
| LXFER % of Contacts | (LXFER / Contacts) × 100 |

## Compatibility

- **Browser**: Google Chrome (Manifest V3)
- **OS**: Windows, macOS, Linux (Chrome extensions are OS-agnostic)
- **Target**: Convoso Reporting Dashboard

## File Structure

```
convoso-insight-lens/
├── manifest.json       # Extension manifest (MV3)
├── content.js          # Injected into Convoso pages
├── styles.css          # In-page visual styles
├── popup.html/js/css   # Extension popup UI
├── dashboard.html/js/css # Full dashboard window
├── lib/
│   └── chart.min.js    # Bundled Chart.js (CSP compliant)
└── icons/
    └── icon*.png       # Extension icons
```

## Version

1.0.0

## License

Internal use only.
