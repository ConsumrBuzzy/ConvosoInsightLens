# Convoso Insight Lens

A Chrome Extension that adds 6 calculated "Lensed" columns directly into Convoso reports for instant sales conversion insights.

## Features

- **6 Lensed Columns** - APPT%(C), APPT%(D), LXFER%(C), LXFER%(D), SUCCESS%(C), SUCCESS%(D)
- **Color-Coded by Metric Type** - Blue (APPT), Pink (LXFER), Green (SUCCESS)
- **Column Visibility Toggle** - Show/hide any column via ⚙️ Columns button
- **Persistent Settings** - Preferences saved between sessions
- **Dashboard Overlay** - Full analytics view with agent-by-list breakdown
- **CSV Export** - One-click export with all 6 metrics
- **Minimal Permissions** - Only `activeTab`, `storage` + host permission for convoso.com

## Installation

### Load in Chrome (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `convoso-insight-lens` folder

## Usage

1. Navigate to a Convoso report page
2. Calculated columns appear automatically in tables
3. Click the extension icon → **Open Dashboard Overlay**
4. Export to CSV for further analysis

## Calculated Metrics

| Metric | Formula |
|--------|---------|
| %(C) | Value ÷ Contacts × 100 |
| %(D) | Value ÷ Dialed × 100 |
| Contact % | Contacts ÷ Dialed × 100 |

**Columns:** APPT%(C), APPT%(D), LXFER%(C), LXFER%(D), SUCCESS%(C), SUCCESS%(D)

## File Structure

```
convoso-insight-lens/
├── manifest.json       # Extension manifest (Manifest V3)
├── content.js          # Core logic - injected into Convoso pages
├── popup.html          # Extension popup UI
├── popup.js            # Popup script
├── popup.css           # Popup styles
├── icons/              # Extension icons (16, 48, 128px)
├── PRIVACY_POLICY.md   # Privacy policy
├── PUBLISHING_GUIDE.md # Chrome Web Store publishing guide
└── STORE_LISTING.md    # Store listing content template
```

## Version

2.1.0

## License

MIT
