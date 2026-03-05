import { extractResourcePath, buildUrl } from './url_utils.js';
import { parseConfig } from './config_parser.js';

let actionMap = {};
let reverseMappings = [];
let uniqueIdCounter = 0;

function getUniqueId() {
  return `menu_item_${uniqueIdCounter++}`;
}

async function loadConfig() {
  try {
    // Load Program Config
    const progResult = await chrome.storage.local.get(['programConfig']);
    let menuConfig;

    if (progResult.programConfig) {
      console.log("Loading configuration from local storage");
      menuConfig = progResult.programConfig;
    } else {
      console.log("Loading default configuration from program.json");
      const response = await fetch('program.json');
      if (!response.ok) throw new Error("Failed to fetch program.json");
      const json = await response.json();
      menuConfig = parseConfig(json);
    }

    // Load Reverse Mappings
    const mapResult = await chrome.storage.local.get(['reverseMappingConfig']);
    if (mapResult.reverseMappingConfig) {
        reverseMappings = mapResult.reverseMappingConfig;
        console.log("Loaded reverse mappings:", reverseMappings.length);
    } else {
        reverseMappings = [];
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
  uniqueIdCounter = 0;

  if (!programs || programs.length === 0) {
    chrome.contextMenus.create({
      id: "no-config",
      title: "No configuration loaded",
      contexts: ["page"]
    });
    return;
  }

  const ROOT_ID = getUniqueId();
  chrome.contextMenus.create({
    id: ROOT_ID,
    title: "URL Switcher",
    contexts: ["page"]
  });

  function handleLevel(items, currentParentId, nameGenerator, itemProcessor) {
    const skipLevel = items.length === 1;

    items.forEach((item) => {
      let nextParentId = currentParentId;
      
      if (!skipLevel) {
        const itemId = getUniqueId();
        chrome.contextMenus.create({
          id: itemId,
          parentId: currentParentId,
          title: nameGenerator(item),
          contexts: ["page"]
        });
        nextParentId = itemId;
      }

      if (itemProcessor) {
        itemProcessor(item, nextParentId);
      }
    });
  }

  // Level 1: Programs
  handleLevel(programs, ROOT_ID, (p) => p.name, (prog, parentId) => {
    const envs = prog.environments || [];
    
    // Level 2: Environments
    handleLevel(envs, parentId, (e) => `${e.name} (${e.type})`, (env, parentId) => {
      const instances = env.instances || [];

      // Level 3: Instances
      handleLevel(instances, parentId, (i) => i.type.toUpperCase(), (inst, parentId) => {
        
        // Services definition (Leaves)
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

        services.forEach((svc) => {
          const svcId = getUniqueId();
          chrome.contextMenus.create({
            id: svcId,
            parentId: parentId,
            title: svc.title,
            contexts: ["page"]
          });
          
          actionMap[svcId] = {
            url: inst.url,
            mode: svc.id
          };
        });

      });
    });
  });

  chrome.storage.local.set({ cachedActionMap: actionMap });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let action = actionMap[info.menuItemId];

  if (!action) {
    try {
      const result = await chrome.storage.local.get(['cachedActionMap']);
      if (result.cachedActionMap) {
        actionMap = result.cachedActionMap;
        action = actionMap[info.menuItemId];
      }
    } catch (e) {
      console.error("Failed to restore actionMap from storage", e);
    }
  }

  if (action) {
    const currentUrl = tab.url;
    // Pass reverseMappings here
    let resourcePath = extractResourcePath(currentUrl, reverseMappings);
    
    if (!resourcePath) {
       console.log("Could not extract resource path. Opening base URL.");
       chrome.tabs.create({ url: action.url });
       return;
    }

    const newUrl = buildUrl(action.url, resourcePath, action.mode);
    chrome.tabs.create({ url: newUrl });
  } else {
    console.warn("Unknown action or lost map for ID:", info.menuItemId);
  }
});

chrome.runtime.onInstalled.addListener(loadConfig);
chrome.runtime.onStartup.addListener(loadConfig);

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
      // Reload if either config changes
      if (changes.programConfig || changes.reverseMappingConfig) {
          loadConfig();
      }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reloadConfig") {
    loadConfig();
    sendResponse({ status: "reloading" });
  }
});
