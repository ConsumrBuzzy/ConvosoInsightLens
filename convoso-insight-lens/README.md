# Convoso Insight Lens

A Chrome Extension that adds calculated APPT % and LXFER % columns directly into Convoso reports for instant sales conversion insights.

## Features

- **Calculated Columns** - Automatically injects APPT % and LXFER % columns into tables
- **Color-Coded Results** - Green (≥10%), Yellow (5-10%), Orange (<5%)
- **Dashboard Overlay** - Full analytics view with agent-by-list breakdown
- **CSV Export** - One-click export for further analysis
- **Minimal Permissions** - Only `activeTab` + host permission for convoso.com

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
| APPT % | (Appointments ÷ Contacts) × 100 |
| LXFER % | (Live Transfers ÷ Contacts) × 100 |
| Contact % | (Contacts ÷ Dialed) × 100 |

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

2.0.0

## License

Internal use only.
