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
      menuConfig = result.programConfig;
    } else {
      console.log("Loading default configuration from program.json");
      const response = await fetch('program.json');
      if (!response.ok) throw new Error("Failed to fetch program.json");
      const json = await response.json();
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

function buildContextMenu(programs) {
  chrome.contextMenus.removeAll();
  actionMap = {}; 

  if (!programs || programs.length === 0) {
    chrome.contextMenus.create({
      id: "no-config",
      title: "No configuration loaded",
      contexts: ["page"]
    });
    return;
  }

  // Create Root Item
  // This ensures the extension icon is displayed next to the root item
  const ROOT_ID = "root_switcher";
  chrome.contextMenus.create({
    id: ROOT_ID,
    title: "URL Switcher",
    contexts: ["page"]
  });

  const skipProgramLevel = programs.length === 1;

  programs.forEach((program, pIndex) => {
    let parentId = ROOT_ID;

    // If multiple programs, create a program level. 
    // If single program, we skip this level and attach environments directly to ROOT.
    if (!skipProgramLevel) {
      const progId = `prog_${pIndex}`;
      chrome.contextMenus.create({
        id: progId,
        parentId: ROOT_ID,
        title: program.name,
        contexts: ["page"]
      });
      parentId = progId;
    }

    if (program.environments) {
      program.environments.forEach((env, eIndex) => {
        // ID generation: progIndex_envIndex
        // We need to ensure uniqueness if we skip program level, but pIndex is 0.
        const envId = `p${pIndex}_env${eIndex}`;
        
        chrome.contextMenus.create({
          id: envId,
          parentId: parentId,
          title: `${env.name} (${env.type})`,
          contexts: ["page"]
        });

        if (env.instances) {
          env.instances.forEach((inst, iIndex) => {
            const instId = `${envId}_inst${iIndex}`;
            chrome.contextMenus.create({
              id: instId,
              parentId: envId,
              title: inst.type.toUpperCase(),
              contexts: ["page"]
            });

            const services = [];
            if (inst.type === 'author') {
              services.push({ id: 'crx', title: 'CRX/DE' });
              services.push({ id: 'editor', title: 'Editor' });
              services.push({ id: 'wcmdisabled', title: 'WCM Disabled' });
              services.push({ id: 'json', title: 'JSON' });
            } else if (inst.type === 'publish') {
              services.push({ id: 'crx', title: 'CRX/DE' });
              services.push({ id: 'json', title: 'JSON' });
            } else {
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
    let resourcePath = extractResourcePath(currentUrl);
    
    if (!resourcePath) {
       console.log("Could not extract resource path. Opening base URL.");
       chrome.tabs.create({ url: action.url });
       return;
    }

    const newUrl = buildUrl(action.url, resourcePath, action.mode);
    chrome.tabs.create({ url: newUrl });
  }
});

chrome.runtime.onInstalled.addListener(loadConfig);
chrome.runtime.onStartup.addListener(loadConfig);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.programConfig) {
    loadConfig();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reloadConfig") {
    loadConfig();
    sendResponse({ status: "reloading" });
  }
});
