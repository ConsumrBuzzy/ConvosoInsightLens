# Convoso Insight Lens

A Chrome Extension that adds calculated performance metrics (APPT % and LXFER %) directly into Convoso reports for instant sales conversion insights.

## Features

- **6 Lensed Columns** - APPT%(C), APPT%(D), LXFER%(C), LXFER%(D), SUCCESS%(C), SUCCESS%(D)
- **Color-Coded by Metric Type** - Blue (APPT), Pink (LXFER), Green (SUCCESS)
- **Column Visibility Toggle** - Show/hide any column via ⚙️ Columns button
- **Persistent Settings** - Preferences saved between sessions via `chrome.storage`
- **Dashboard Overlay** - Full analytics view with agent-by-list breakdown
- **CSV Export** - One-click export with all 6 metrics
- **Zero Data Collection** - All processing happens locally in your browser

## Permissions

This extension uses **minimal permissions**:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Communicate between popup and content script |
| `storage` | Persist column visibility preferences |
| `convoso.com` | Inject enhancement script on Convoso pages only |

**No data is collected, stored, or transmitted.**

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store listing](#) *(link after publishing)*
2. Click **Add to Chrome**

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `convoso-insight-lens` folder

## Usage

1. Navigate to a Convoso report page (e.g., "FB Performance By Agent By List")
2. The extension automatically adds APPT % and LXFER % columns to tables
3. Click the extension icon → **Open Dashboard Overlay** for detailed analysis
4. Use the **Export CSV** button to download data

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

## Privacy

This extension:

- ✅ Processes data locally in your browser
- ✅ Works only on convoso.com domains
- ❌ Does NOT collect any data
- ❌ Does NOT send data to external servers
- ❌ Does NOT store data between sessions

See [PRIVACY_POLICY.md](convoso-insight-lens/PRIVACY_POLICY.md) for full details.

## Publishing

See [PUBLISHING_GUIDE.md](convoso-insight-lens/PUBLISHING_GUIDE.md) for Chrome Web Store submission instructions.

## Version History

| Version | Changes |
|---------|---------|
| 2.1.0 | 6 Lensed columns (SUCCESS added), metric-type coloring, column visibility toggle, persistent settings |
| 2.0.0 | Minimal permissions, inline column injection, dashboard overlay |
| 1.0.0 | Initial release |

## License

MIT
