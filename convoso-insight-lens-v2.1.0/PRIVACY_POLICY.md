# Privacy Policy for Convoso Insight Lens

**Last Updated:** December 2025

## Overview

Convoso Insight Lens is a Chrome browser extension designed to enhance the Convoso reporting dashboard by adding calculated performance metrics directly into your existing reports.

## Data Collection

**We do not collect, store, transmit, or share any data.**

### What This Extension Does
- Reads table data **only** from Convoso report pages you are viewing
- Calculates performance metrics (APPT %, LXFER %) locally in your browser
- Displays calculated columns directly on the page
- Optionally exports data to CSV **locally to your device**

### What This Extension Does NOT Do
- ❌ Collect personal information
- ❌ Track browsing history
- ❌ Send data to external servers
- ❌ Store data between sessions
- ❌ Access data from any website other than convoso.com
- ❌ Access your Convoso login credentials
- ❌ Modify or submit any data to Convoso

## Permissions Explained

This extension requests minimal permissions:

| Permission | Why It's Needed |
|------------|-----------------|
| `activeTab` | To communicate between the extension popup and the active Convoso tab |
| `Host Permission: convoso.com` | To inject the visual enhancement script only on Convoso pages |

## Data Processing

All data processing occurs **entirely within your browser**:

1. The extension reads the HTML content of Convoso report tables
2. It parses numeric values (Dialed, Contacts, APPT, LXFER)
3. It calculates percentages using simple division
4. It displays results by adding columns to the existing table

**No data leaves your browser. No data is stored after you close the tab.**

## Third-Party Services

This extension does not integrate with, connect to, or transmit data to any third-party services, analytics platforms, or external APIs.

## Data Security

Since no data is collected or transmitted:
- There is no database to breach
- There is no server to compromise
- Your Convoso data never leaves your local session

## Changes to This Policy

Any changes to this privacy policy will be reflected in the extension update notes and this document.

## Contact

For questions about this privacy policy or the extension:
- **GitHub Issues:** [Repository Issues Page]
- **Email:** [Your Contact Email]

## Compliance

This extension is designed to comply with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) principles

---

**Summary:** This extension processes Convoso report data locally in your browser to display calculated metrics. No data is collected, stored, or transmitted anywhere.
