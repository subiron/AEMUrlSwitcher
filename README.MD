# AEM URL Switcher Extension Setup


## Features

- Right click on page and choose
   program > environment >  instance > service
   where service can be crx/de json wcmmode disabled editor.
- Switch between instances and live

## How to Load the Extension

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable "Developer mode" using the toggle in the top right corner.
3.  Click the "Load unpacked" button in the top left.


## Configuration

The extension automatically loads the configuration from `default.json` in this directory.
To modify the configuration:
1.  Click the extension icon in the toolbar (you might need to pin it).
2.  Right-click the icon and select "Options".
3.  Paste your new JSON configuration ethier like in default format or you can also pase  json body of /'api/program' response from your AEM as a Cloud manager console.

- 
reverse mapping transformer
"www.eplan.com/de-en/services/onboarding-services/".replace(/.*?eplan.com\/(..)-(..)\/(.*)/, "/content/eplan-relaunch/$1/$2/$3")

