# URL Switcher Extension Setup

This folder contains the source code for the "URL Switcher" Chrome extension.

## How to Load the Extension

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable "Developer mode" using the toggle in the top right corner.
3.  Click the "Load unpacked" button in the top left.
4.  Select this directory (`/Users/subiron/slop/switcher`).

## Configuration

The extension automatically loads the configuration from `program.json` in this directory.
To modify the configuration:
1.  Click the extension icon in the toolbar (you might need to pin it).
2.  Right-click the icon and select "Options".
3.  Paste your new JSON configuration (in the format of `program.json`) and click "Save".

## Troubleshooting

-   **Context Menu Not Appearing:** Reload the extension from `chrome://extensions/` and refresh the page you are on.
-   **Invalid Configuration:** Check the extension's background page console for errors (link "service worker" in `chrome://extensions/`).

## File Structure

-   `manifest.json`: Extension definition.
-   `background.js`: Main logic (Service Worker).
-   `url_utils.js`: URL parsing and transformation logic.
-   `config_parser.js`: Parses `program.json`.
-   `options.html` / `options.js`: Configuration page.
-   `program.json`: Default configuration (bundled).
