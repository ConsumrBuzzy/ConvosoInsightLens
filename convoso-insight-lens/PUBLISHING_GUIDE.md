# Chrome Web Store Publishing Guide

A step-by-step guide to publish Convoso Insight Lens to the Chrome Web Store.

---

## Prerequisites Checklist

Before publishing, ensure you have:

- [ ] **Chrome Developer Account** ($5 one-time fee)
  - Register at: https://chrome.google.com/webstore/devconsole/register
- [ ] **Icons** (16x16, 48x48, 128x128 PNG)
- [ ] **Screenshots** (at least 1, recommended 3-5)
- [ ] **Privacy Policy URL** (hosted publicly)
- [ ] **Extension ZIP file**

---

## Step 1: Prepare the Extension Package

### 1.1 Verify File Structure
```
convoso-insight-lens/
├── manifest.json          ✅ Required
├── content.js             ✅ Required  
├── popup.html             ✅ Required
├── popup.js               ✅ Required
├── popup.css              ✅ Required
├── icons/
│   ├── icon16.png         ✅ Required (16x16)
│   ├── icon48.png         ✅ Required (48x48)
│   └── icon128.png        ✅ Required (128x128)
├── PRIVACY_POLICY.md      ✅ Required (host publicly)
└── README.md              📝 Optional but recommended
```

### 1.2 Optimize Icons

**IMPORTANT:** Your current icons are ~1MB each. Chrome Web Store expects:
- 16x16: < 5KB
- 48x48: < 15KB  
- 128x128: < 50KB

**Fix:** Re-export icons at correct dimensions using any image editor.

### 1.3 Create ZIP File

```powershell
# Navigate to parent directory
cd C:\Users\cheat\OneDrive\Documents\GitHub\December_2025\ConvosoInsightLens

# Create ZIP (exclude dev files)
Compress-Archive -Path convoso-insight-lens\* -DestinationPath convoso-insight-lens-v2.0.0.zip -Force
```

**Exclude from ZIP:**
- `.git` folder
- `PUBLISHING_GUIDE.md`
- `STORE_LISTING.md`
- Any test files

---

## Step 2: Host Privacy Policy

The Chrome Web Store requires a **publicly accessible URL** for your privacy policy.

### Option A: GitHub Pages (Recommended)
1. Create `docs/privacy-policy.html` in your repo
2. Enable GitHub Pages in repo settings
3. URL: `https://[username].github.io/ConvosoInsightLens/privacy-policy.html`

### Option B: GitHub Raw File
- URL: `https://github.com/[username]/ConvosoInsightLens/blob/main/convoso-insight-lens/PRIVACY_POLICY.md`

### Option C: Google Sites / Notion
- Create a free page and paste the privacy policy content

---

## Step 3: Create Screenshots

Required dimensions: **1280x800** or **640x400** pixels

### Recommended Screenshots:

1. **Main Feature** - Show a Convoso table with injected APPT% and LXFER% columns
2. **Color Coding** - Highlight the green/yellow/orange color coding
3. **Dashboard Overlay** - Show the overlay dashboard open
4. **Popup UI** - Show the extension popup

### How to Capture:
1. Navigate to a Convoso report (or use demo/test data)
2. Use Chrome DevTools (F12) > Device Toolbar > Set to 1280x800
3. Take full-page screenshot

---

## Step 4: Submit to Chrome Web Store

### 4.1 Access Developer Dashboard
1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account
3. Pay $5 registration fee (if first time)

### 4.2 Create New Item
1. Click **"New Item"**
2. Upload your ZIP file

### 4.3 Fill Store Listing

Copy from `STORE_LISTING.md`:

| Field | Value |
|-------|-------|
| **Language** | English (United States) |
| **Extension Name** | Convoso Insight Lens |
| **Short Description** | Adds APPT % and LXFER % calculated columns to Convoso reports for instant sales conversion insights. |
| **Description** | [Copy detailed description from STORE_LISTING.md] |
| **Category** | Productivity |
| **Extension Icon** | Upload 128x128 icon |

### 4.4 Upload Assets
- Upload 1-5 screenshots (1280x800)
- Upload small promo tile (440x280) - optional but recommended

### 4.5 Privacy Tab

| Question | Answer |
|----------|--------|
| **Single Purpose** | This extension adds calculated performance metric columns (APPT % and LXFER %) directly into Convoso report tables. |
| **Permission Justifications** | [Copy from STORE_LISTING.md] |
| **Privacy Policy URL** | [Your hosted URL] |
| **Data Collection** | No, this extension does not collect any user data |

### 4.6 Distribution Tab

| Setting | Recommendation |
|---------|----------------|
| **Visibility** | Public |
| **Distribution** | All regions |

---

## Step 5: Submit for Review

1. Click **"Submit for Review"**
2. Typical review time: 1-3 business days
3. You'll receive email notification when approved/rejected

---

## Common Rejection Reasons & Fixes

### 1. "Permission not justified"
**Fix:** Ensure permission justifications clearly explain WHY each permission is needed.

### 2. "Missing privacy policy"
**Fix:** Host privacy policy at a publicly accessible URL.

### 3. "Functionality not working"
**Fix:** Test extension thoroughly before submission.

### 4. "Misleading description"
**Fix:** Only describe features that actually exist in the extension.

### 5. "Icon quality issues"
**Fix:** Use properly sized PNG icons without transparency issues.

---

## Post-Approval Checklist

- [ ] Test the published extension
- [ ] Monitor reviews for user feedback
- [ ] Set up issue tracking for bug reports
- [ ] Plan update cadence for improvements

---

## Updating the Extension

1. Increment version in `manifest.json` (e.g., 2.0.0 → 2.0.1)
2. Create new ZIP file
3. Go to Developer Dashboard → Your extension → Package
4. Upload new ZIP
5. Submit for review

---

## Useful Links

- **Developer Dashboard:** https://chrome.google.com/webstore/devconsole
- **Program Policies:** https://developer.chrome.com/docs/webstore/program-policies
- **Manifest V3 Docs:** https://developer.chrome.com/docs/extensions/mv3
- **Publishing Docs:** https://developer.chrome.com/docs/webstore/publish
