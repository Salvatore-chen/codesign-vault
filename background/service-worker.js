importScripts("../shared/parse.js");

const STORAGE_KEY = "prototypes";

/** @type {Map<string, string>} */
const passwordCache = new Map();

/** @type {Promise<void> | null} */
let cacheReady = null;

function refreshCache() {
  cacheReady = (async () => {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const prototypes = result[STORAGE_KEY] || [];

    passwordCache.clear();
    for (const item of prototypes) {
      const prototypeId = extractPrototypeId(item.url);
      if (prototypeId && item.password) {
        passwordCache.set(prototypeId, item.password);
      }
    }
  })();

  return cacheReady;
}

function ensureCache() {
  if (!cacheReady) return refreshCache();
  return cacheReady;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {number} tabId
 * @param {string} url
 * @param {{ retries?: number }} [options]
 */
async function injectForUrl(tabId, url, options = {}) {
  if (!tabId || !url?.startsWith("https://codesign.qq.com/")) return false;

  const prototypeId = extractPrototypeId(url);
  if (!prototypeId) return false;

  await ensureCache();
  const password = passwordCache.get(prototypeId);
  if (!password) return false;

  const retries = options.retries ?? 6;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(16 * attempt);

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        injectImmediately: true,
        world: "MAIN",
        func: (id, pwd) => {
          try {
            localStorage.setItem(`secret_${id}`, pwd);
          } catch {
            // Ignore storage write failures during early navigation.
          }
        },
        args: [prototypeId, password]
      });
      return true;
    } catch {
      // Document may not be ready yet; retry.
    }
  }

  return false;
}

async function syncOpenTabs() {
  await ensureCache();
  const tabs = await chrome.tabs.query({ url: "https://codesign.qq.com/*" });
  await Promise.all(tabs.map((tab) => injectForUrl(tab.id, tab.url)));
}

refreshCache();

chrome.runtime.onInstalled.addListener(async () => {
  await refreshCache();
  await syncOpenTabs();
});

chrome.runtime.onStartup.addListener(() => {
  refreshCache();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "sync" && changes[STORAGE_KEY]) {
    await refreshCache();
    await syncOpenTabs();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url?.startsWith("https://codesign.qq.com/")) return;
  injectForUrl(details.tabId, details.url);
});

chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url?.startsWith("https://codesign.qq.com/")) return;
  injectForUrl(details.tabId, details.url, { retries: 2 });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url?.startsWith("https://codesign.qq.com/")) return;
  injectForUrl(details.tabId, details.url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INJECT_FOR_URL") {
    const tabId = sender.tab?.id;
    const url = message.url || sender.tab?.url;
    if (!tabId || !url) return;

    injectForUrl(tabId, url)
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "OPEN_PROTOTYPE") {
    const url = message.url;
    if (!url) return;

    (async () => {
      await refreshCache();
      const tab = await chrome.tabs.create({ url });
      if (tab.id) {
        // Immediate attempts often fail before commit; retries cover early load.
        injectForUrl(tab.id, url);
      }
      sendResponse({ ok: true, tabId: tab.id });
    })().catch(() => sendResponse({ ok: false }));

    return true;
  }
});
