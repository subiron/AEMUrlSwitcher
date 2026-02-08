import { parseConfig } from './config_parser.js';

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('configJson');
  const exportBtn = document.getElementById('exportConfig');
  const importBtn = document.getElementById('importConfigBtn');
  const importFile = document.getElementById('importConfigFile');
  const resetBtn = document.getElementById('resetConfig');
  const saveBtn = document.getElementById('saveConfig');
  const importCloudBtn = document.getElementById('importCloudBtn');
  const importCloudFile = document.getElementById('importCloudFile');
  const statusDiv = document.getElementById('status');

  // Helper: Show status message
  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }

  // Helper: Update Textarea with current config
  function updateConfigDisplay() {
    chrome.storage.local.get(['programConfig'], (result) => {
      if (result.programConfig) {
        // We now store the *parsed* minimal config, not the raw program.json
        // But wait, the background script currently expects the raw program.json structure?
        // Let's check background.js. 
        // background.js: `const menuConfig = parseConfig(json);`
        // So background.js expects `program.json` format currently.
        
        // The user wants: 
        // 1. "Import/Export configuration minimal specific for this plugin" 
        //    -> implies storing the RESULT of parseConfig.
        // 2. "Import from cloud" -> takes program.json format.
        
        // So we need to change how we store data. 
        // Let's assume `programConfig` in storage now holds the MINIMAL structure (array of programs).
        
        textarea.value = JSON.stringify(result.programConfig, null, 2);
      } else {
        // If nothing in storage, load default program.json, parse it, and show that.
        fetch(chrome.runtime.getURL('program.json'))
          .then(res => res.json())
          .then(json => {
            const minimal = parseConfig(json);
            textarea.value = JSON.stringify(minimal, null, 2);
            // Auto-save the default minimal config to storage?
            // chrome.storage.local.set({ programConfig: minimal });
          })
          .catch(err => {
            console.error("Failed to load default config", err);
            textarea.value = "[]";
          });
      }
    });
  }

  // Helper: Save minimal config to storage
  function saveMinimalConfig(config) {
    chrome.storage.local.set({ programConfig: config }, () => {
      showStatus("Configuration saved! Context menu updated.");
      updateConfigDisplay();
      chrome.runtime.sendMessage({ action: "reloadConfig" });
    });
  }

  // --- Event Listeners ---

  // Save Manual Changes (Textarea)
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      try {
        const json = JSON.parse(textarea.value);
        if (!Array.isArray(json)) {
            throw new Error("Invalid configuration: Must be an array.");
        }
        if (json.length > 0 && !json[0].environments) {
             throw new Error("Invalid format: Missing 'environments' property.");
        }
        saveMinimalConfig(json);
      } catch (e) {
        showStatus("Error: " + e.message, 'error');
      }
    });
  }

  // Export
  exportBtn.addEventListener('click', () => {
    const config = textarea.value;
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'url-switcher-config.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import Minimal JSON
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
            throw new Error("Invalid format: Configuration must be an array of programs.");
        }
        // Basic validation: check for 'environments' in items
        if (json.length > 0 && !json[0].environments) {
             throw new Error("Invalid format: Missing 'environments' property.");
        }
        saveMinimalConfig(json);
      } catch (err) {
        showStatus("Error importing file: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
    // Reset input
    importFile.value = ''; 
  });

  // Import Cloud JSON (program.json format)
  importCloudBtn.addEventListener('click', () => importCloudFile.click());
  importCloudFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const minimalConfig = parseConfig(json);
        
        if (minimalConfig.length === 0) {
             throw new Error("No valid programs found in Cloud JSON.");
        }
        
        saveMinimalConfig(minimalConfig);
        showStatus("Cloud configuration imported and converted successfully!");
      } catch (err) {
        showStatus("Error importing Cloud JSON: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
    importCloudFile.value = '';
  });

  // Reset to Default
  resetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset to the default configuration?")) {
        fetch(chrome.runtime.getURL('program.json'))
        .then(res => res.json())
        .then(json => {
            const minimal = parseConfig(json);
            saveMinimalConfig(minimal);
            showStatus("Reset to default configuration.");
        })
        .catch(err => {
            showStatus("Error resetting config: " + err.message, 'error');
        });
    }
  });

  // Initialize
  updateConfigDisplay();
});
