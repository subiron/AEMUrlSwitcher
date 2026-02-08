import { extractResourcePath, buildUrl } from './url_utils.js';
import { parseConfig } from './config_parser.js';

let actionMap = {};

async function loadConfig() {
  try {
    // Check storage first
    const result = await chrome.storage.local.get(['programConfig']);
    let menuConfig;

    if (result.programConfig) {
      console.log("Loading configuration from local storage");
      // Storage now holds the parsed minimal config
      menuConfig = result.programConfig;
    } else {
      console.log("Loading default configuration from program.json");
      const response = await fetch('program.json');
      if (!response.ok) throw new Error("Failed to fetch program.json");
      const json = await response.json();
      // Parse the raw cloud JSON
      menuConfig = parseConfig(json);
    }

    buildContextMenu(menuConfig);
  } catch (e) {
    console.error("Failed to load configuration", e);
    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: "error",
      title: "Error loading configuration",
      contexts: ["page"]
    });
  }
}

// Listen for storage changes to reload context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.programConfig) {
    loadConfig();
  }
});

// Listen for explicit reload requests (e.g. from options page)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reloadConfig") {
    loadConfig();
    sendResponse({ status: "reloading" });
  }
});

function buildContextMenu(programs) {
  chrome.contextMenus.removeAll();
  actionMap = {}; // Reset actions

  if (!programs || programs.length === 0) {
    chrome.contextMenus.create({
      id: "no-config",
      title: "No configuration loaded",
      contexts: ["page"]
    });
    return;
  }

  const skipProgramLevel = programs.length === 1;

  programs.forEach((program, pIndex) => {
    let parentId = undefined;

    if (!skipProgramLevel) {
      parentId = `prog_${pIndex}`;
      chrome.contextMenus.create({
        id: parentId,
        title: program.name,
        contexts: ["page"]
      });
    }

    if (program.environments) {
      program.environments.forEach((env, eIndex) => {
        const envId = `${parentId ? parentId + '_' : ''}env_${eIndex}`;
        chrome.contextMenus.create({
          id: envId,
          parentId: parentId,
          title: `${env.name} (${env.type})`,
          contexts: ["page"]
        });

        if (env.instances) {
          env.instances.forEach((inst, iIndex) => {
            const instId = `${envId}_inst_${iIndex}`;
            chrome.contextMenus.create({
              id: instId,
              parentId: envId,
              title: inst.type.toUpperCase(),
              contexts: ["page"]
            });

            const services = [];
            // Define services based on instance type
            if (inst.type === 'author') {
              services.push({ id: 'crx', title: 'CRX/DE' });
              services.push({ id: 'editor', title: 'Editor' });
              services.push({ id: 'wcmdisabled', title: 'WCM Disabled' });
              services.push({ id: 'json', title: 'JSON' });
            } else if (inst.type === 'publish') {
              services.push({ id: 'crx', title: 'CRX/DE' });
              services.push({ id: 'json', title: 'JSON' });
            } else {
              // Preview / Live -> just open
              services.push({ id: 'open', title: 'Open' });
            }

            services.forEach(svc => {
              const svcId = `${instId}_svc_${svc.id}`;
              chrome.contextMenus.create({
                id: svcId,
                parentId: instId,
                title: svc.title,
                contexts: ["page"]
              });
              
              // Store the action data
              actionMap[svcId] = {
                url: inst.url,
                mode: svc.id
              };
            });
          });
        }
      });
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const action = actionMap[info.menuItemId];
  if (action) {
    const currentUrl = tab.url;
    // Extract resource path
    let resourcePath = extractResourcePath(currentUrl);
    
    // Fallback logic: "Jesli ekstrakcja url nie jest mozliwa robimy fallback na adres bazowy instancji."
    if (!resourcePath) {
       console.log("Could not extract resource path. Opening base URL.");
       chrome.tabs.create({ url: action.url }); // Just open the instance base URL
       return;
    }

    const newUrl = buildUrl(action.url, resourcePath, action.mode);
    chrome.tabs.create({ url: newUrl });
  }
});

chrome.runtime.onInstalled.addListener(loadConfig);
chrome.runtime.onStartup.addListener(loadConfig);