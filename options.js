import { parseConfig } from './config_parser.js';
import { reverseMapping } from './url_utils.js';

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

  // Mapping Elements
  const mappingList = document.getElementById('mappingList');
  const newPatternInput = document.getElementById('newPattern');
  const newReplacementInput = document.getElementById('newReplacement');
  const addMappingBtn = document.getElementById('addMappingBtn');
  const testUrlInput = document.getElementById('testUrlInput');
  const testMappingBtn = document.getElementById('testMappingBtn');
  const testResultSpan = document.getElementById('testResult');

  // Dialog elements
  const dialog = document.getElementById('importChoiceDialog');
  const btnMerge = document.getElementById('btnMerge');
  const btnReplace = document.getElementById('btnReplace');
  const btnCancel = document.getElementById('btnCancelImport');

  let pendingConfig = null;
  let currentMappings = [];

  // Helper: Show status message
  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }

  // --- Configuration Logic ---

  function getCurrentConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['programConfig'], (result) => {
        resolve(result.programConfig || []);
      });
    });
  }

  function updateConfigDisplay() {
    getCurrentConfig().then(config => {
      if (config.length === 0) {
         fetch(chrome.runtime.getURL('program.json'))
          .then(res => res.json())
          .then(json => {
            const minimal = parseConfig(json);
            textarea.value = JSON.stringify(minimal, null, 2);
          })
          .catch(() => textarea.value = "[]");
      } else {
        textarea.value = JSON.stringify(config, null, 2);
      }
    });
  }

  function saveMinimalConfig(config) {
    chrome.storage.local.set({ programConfig: config }, () => {
      showStatus("Configuration saved! Context menu updated.");
      updateConfigDisplay();
      chrome.runtime.sendMessage({ action: "reloadConfig" });
    });
  }

  // --- Mapping Logic ---

  function loadMappings() {
      chrome.storage.local.get(['reverseMappingConfig'], (result) => {
          currentMappings = result.reverseMappingConfig || [];
          renderMappings();
      });
  }

  function saveMappings() {
      chrome.storage.local.set({ reverseMappingConfig: currentMappings }, () => {
          showStatus("Mappings saved!");
          chrome.runtime.sendMessage({ action: "reloadConfig" });
          renderMappings();
      });
  }

  function renderMappings() {
      mappingList.innerHTML = '';
      currentMappings.forEach((mapping, index) => {
          const tr = document.createElement('tr');
          
          const tdPattern = document.createElement('td');
          tdPattern.textContent = mapping.pattern;
          tr.appendChild(tdPattern);

          const tdReplacement = document.createElement('td');
          tdReplacement.textContent = mapping.replacement;
          tr.appendChild(tdReplacement);

          const tdAction = document.createElement('td');
          const delBtn = document.createElement('button');
          delBtn.textContent = "Del";
          delBtn.className = "btn-danger";
          delBtn.style.padding = "2px 5px";
          delBtn.onclick = () => {
              currentMappings.splice(index, 1);
              saveMappings();
          };
          tdAction.appendChild(delBtn);
          tr.appendChild(tdAction);

          mappingList.appendChild(tr);
      });
  }

  addMappingBtn.addEventListener('click', () => {
      const pattern = newPatternInput.value.trim();
      const replacement = newReplacementInput.value.trim();
      
      if (!pattern || !replacement) {
          showStatus("Pattern and Replacement are required.", 'error');
          return;
      }

      try {
          new RegExp(pattern); // Validate Regex
      } catch (e) {
          showStatus("Invalid Regex Pattern: " + e.message, 'error');
          return;
      }

      currentMappings.push({ pattern, replacement });
      saveMappings();
      
      newPatternInput.value = '';
      newReplacementInput.value = '';
  });

  testMappingBtn.addEventListener('click', () => {
      const url = testUrlInput.value.trim();
      if (!url) return;
      
      const result = reverseMapping(url, currentMappings);
      if (result) {
          testResultSpan.textContent = result;
          testResultSpan.style.color = "green";
      } else {
          testResultSpan.textContent = "No match found (or extraction failed)";
          testResultSpan.style.color = "red";
      }
  });


  // --- Merge Logic ---
  function mergeConfigs(existing, incoming) {
    const merged = JSON.parse(JSON.stringify(existing));
    const progMap = new Map(merged.map(p => [p.name, p]));

    incoming.forEach(incProg => {
      const exProg = progMap.get(incProg.name);
      if (exProg) {
        if (!exProg.environments) exProg.environments = [];
        const envMap = new Map(exProg.environments.map(e => [e.name, e])); 

        incProg.environments.forEach(incEnv => {
          const envKey = incEnv.name;
          const exEnv = envMap.get(envKey);
          if (exEnv) {
             exEnv.type = incEnv.type;
             exEnv.instances = incEnv.instances;
          } else {
             exProg.environments.push(incEnv);
             envMap.set(envKey, incEnv); 
          }
        });
      } else {
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
  btnMerge.addEventListener('click', performMerge);
  btnReplace.addEventListener('click', performReplace);
  btnCancel.addEventListener('click', () => {
    pendingConfig = null;
    dialog.close();
    importFile.value = '';
    importCloudFile.value = '';
  });

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

  resetBtn.addEventListener('click', () => {
    if (confirm("Reset to default?")) {
        fetch(chrome.runtime.getURL('program.json'))
        .then(res => res.json())
        .then(json => {
            const minimal = parseConfig(json);
            saveMinimalConfig(minimal);
        });
    }
  });

  // Init
  updateConfigDisplay();
  loadMappings();
});
