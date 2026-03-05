# AEM URL Switcher Extension

A Chrome extension to quickly switch between different AEM (Adobe Experience Manager) environments and instances while maintaining the current resource context.

## Features

- **Quick Environment Switching**: Right-click on any AEM page to switch between Programs, Environments (Dev, Stage, Prod), and Instances (Author, Publish).
- **Service Shortcuts**: Direct access to CRX/DE, AEM Editor, WCM Disabled mode, and JSON view.
- **Reverse URL Mapping**: Automatically map live public URLs back to their internal AEM content paths using configurable regular expressions.
- **Context Preservation**: Attempts to keep you on the same page or asset when switching between author and publish instances.

## How to Load the Extension

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **"Developer mode"** using the toggle in the top right corner.
3.  Click the **"Load unpacked"** button and select the extension directory.

## Configuration

The extension can be configured via the **Options** page (Right-click the extension icon > Options).

### Environment Configuration
You can manage your AEM environments in two ways:
1.  **Manual JSON**: Edit the JSON configuration directly in the text area.
2.  **Cloud Manager Import**: Import the JSON response from the AEM Cloud Manager API (`/api/program`) to automatically populate your environments.

The configuration supports merging or replacing existing settings when importing.

### Reverse URL Mapping
When you are on a live site that doesn't use standard AEM paths (e.g., `www.company.com/en/about.html`), you can define rules to map these to internal paths (e.g., `/content/company/en/about`).

- **Pattern**: A regular expression to match the live URL (e.g., `.*?company.com/(..)/(.*)`).
- **Replacement**: A string using capture groups to build the content path (e.g., `/content/company/$1/$2`).

The Options page includes a **Test Mapping** tool to verify your regex and replacement strings before saving.

## Technical Details

- **url_utils.js**: Core logic for path extraction and URL building.
- **config_parser.js**: Handles parsing of custom and Cloud Manager JSON formats.
- **background.js**: Manages the dynamic context menu and storage synchronization.

