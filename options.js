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

  // Dialog elements
  const dialog = document.getElementById('importChoiceDialog');
  const btnMerge = document.getElementById('btnMerge');
  const btnReplace = document.getElementById('btnReplace');
  const btnCancel = document.getElementById('btnCancelImport');

  let pendingConfig = null;

  // Helper: Show status message
  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }

  // Helper: Get current config from storage (promise)
  function getCurrentConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['programConfig'], (result) => {
        resolve(result.programConfig || []);
      });
    });
  }

  // Helper: Update Textarea
  function updateConfigDisplay() {
    getCurrentConfig().then(config => {
      if (config.length === 0) {
        // Try loading default just for display if storage is empty
         fetch(chrome.runtime.getURL('program.json'))
          .then(res => res.json())
          .then(json => {
            const minimal = parseConfig(json);
             // Don't save, just show
            textarea.value = JSON.stringify(minimal, null, 2);
          })
          .catch(() => textarea.value = "[]");
      } else {
        textarea.value = JSON.stringify(config, null, 2);
      }
    });
  }

  // Helper: Save config
  function saveMinimalConfig(config) {
    chrome.storage.local.set({ programConfig: config }, () => {
      showStatus("Configuration saved! Context menu updated.");
      updateConfigDisplay();
      chrome.runtime.sendMessage({ action: "reloadConfig" });
    });
  }

  // --- Merge Logic ---
  function mergeConfigs(existing, incoming) {
    // Deep clone existing to avoid mutating input reference immediately
    const merged = JSON.parse(JSON.stringify(existing));
    // Match by Name
    const progMap = new Map(merged.map(p => [p.name, p]));

    incoming.forEach(incProg => {
      const exProg = progMap.get(incProg.name);
      if (exProg) {
        // Merge Environments
        if (!exProg.environments) exProg.environments = [];
        
        // Match Environments by Name
        const envMap = new Map(exProg.environments.map(e => [e.name, e])); 

        incProg.environments.forEach(incEnv => {
          const envKey = incEnv.name;
          const exEnv = envMap.get(envKey);
          
          if (exEnv) {
             // Update details
             exEnv.type = incEnv.type;
             // Replace instances
             exEnv.instances = incEnv.instances;
          } else {
             // Add new environment
             exProg.environments.push(incEnv);
             envMap.set(envKey, incEnv); 
          }
        });

      } else {
        // Add new program
        merged.push(incProg);
        progMap.set(incProg.name, incProg);
      }
    });

    return merged;
  }


  // --- Import Flow ---
  function handleImport(newConfig) {
    pendingConfig = newConfig;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      // Fallback for very old browsers (unlikely in Chrome Ext)
      if (confirm("Click OK to Merge, Cancel to Replace")) {
         performMerge();
      } else {
         performReplace();
      }
    }
  }

  function performReplace() {
    saveMinimalConfig(pendingConfig);
    pendingConfig = null;
    dialog.close();
  }

  async function performMerge() {
    const current = await getCurrentConfig();
    const merged = mergeConfigs(current, pendingConfig);
    saveMinimalConfig(merged);
    pendingConfig = null;
    dialog.close();
  }


  // --- Listeners ---

  // Dialog Buttons
  btnMerge.addEventListener('click', performMerge);
  btnReplace.addEventListener('click', performReplace);
  btnCancel.addEventListener('click', () => {
    pendingConfig = null;
    dialog.close();
    // Clear file inputs
    importFile.value = '';
    importCloudFile.value = '';
  });


  // Import Minimal
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) throw new Error("Invalid format.");
        handleImport(json);
      } catch (err) {
        showStatus("Error: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
    importFile.value = ''; 
  });

  // Import Cloud
  importCloudBtn.addEventListener('click', () => importCloudFile.click());
  importCloudFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const minimal = parseConfig(json);
        if (minimal.length === 0) throw new Error("No programs found.");
        handleImport(minimal);
      } catch (err) {
        showStatus("Error: " + err.message, 'error');
      }
    };
    reader.readAsText(file);
    importCloudFile.value = '';
  });

  // Save Manual
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      try {
        const json = JSON.parse(textarea.value);
        if (!Array.isArray(json)) throw new Error("Invalid array.");
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

  // Reset
  resetBtn.addEventListener('click', () => {
    if (confirm("Reset to default?")) {
        fetch(chrome.runtime.getURL('program.json'))
        .then(res => res.json())
        .then(json => {
            const minimal = parseConfig(json);
            // Treat reset as a "Replace" with default
            saveMinimalConfig(minimal);
        });
    }
  });

  // Init
  updateConfigDisplay();
});