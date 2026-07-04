importScripts("../shared/parse.js");

const STORAGE_KEY = "prototypes";

/** @type {Map<string, string>} */
const passwordCache = new Map();

async function refreshCache() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const prototypes = result[STORAGE_KEY] || [];

  passwordCache.clear();
  for (const item of prototypes) {
    const prototypeId = extractPrototypeId(item.url);
    if (prototypeId && item.password) {
      passwordCache.set(prototypeId, item.password);
    }
  }
}

async function ensureCache() {
  if (passwordCache.size === 0) {
    await refreshCache();
  }
}

async function injectForUrl(tabId, url) {
  if (!tabId || !url?.startsWith("https://codesign.qq.com/")) return;

  const prototypeId = extractPrototypeId(url);
  if (!prototypeId) return;

  await ensureCache();
  const password = passwordCache.get(prototypeId);
  if (!password) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      injectImmediately: true,
      world: "MAIN",
      func: (id, pwd) => {
        localStorage.setItem(`secret_${id}`, pwd);
      },
      args: [prototypeId, password]
    });
  } catch {
    // Navigation may not be ready yet.
  }
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

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "sync" && changes[STORAGE_KEY]) {
    await refreshCache();
    await syncOpenTabs();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  injectForUrl(details.tabId, details.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  injectForUrl(details.tabId, details.url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INJECT_FOR_URL") {
    const tabId = sender.tab?.id;
    const url = message.url || sender.tab?.url;
    if (!tabId || !url) return;

    injectForUrl(tabId, url)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "OPEN_PROTOTYPE") {
    const url = message.url;
    if (!url) return;

    chrome.tabs
      .create({ url })
      .then((tab) => {
        if (tab.id) {
          injectForUrl(tab.id, url);
        }
        sendResponse({ ok: true, tabId: tab.id });
      })
      .catch(() => sendResponse({ ok: false }));

    return true;
  }
});
