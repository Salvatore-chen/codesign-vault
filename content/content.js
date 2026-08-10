function isExtensionAlive() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function requestInject() {
  if (!isExtensionAlive()) return;

  chrome.runtime
    .sendMessage({
      type: "INJECT_FOR_URL",
      url: window.location.href
    })
    .catch(() => {});
}

/**
 * Write secret directly from sync storage at document_start.
 * localStorage is shared with the page, so this is the earliest reliable path.
 * If the page may already have read an empty secret, reload once so CoDesign
 * picks up the value (matches the manual refresh workaround).
 */
function applyPasswordFromStorage() {
  if (!isExtensionAlive()) return;

  const prototypeId = extractPrototypeId(window.location.href);
  if (!prototypeId) return;

  chrome.storage.sync.get("prototypes", (result) => {
    if (chrome.runtime.lastError) return;

    const prototypes = result.prototypes || [];
    const matched = prototypes.find(
      (item) => extractPrototypeId(item.url) === prototypeId && item.password
    );
    if (!matched?.password) return;

    const key = `secret_${prototypeId}`;
    let previous = null;
    try {
      previous = localStorage.getItem(key);
      localStorage.setItem(key, matched.password);
    } catch {
      return;
    }

    if (previous === matched.password) return;

    const reloadKey = `__codesign_vault_reloaded_${prototypeId}`;
    try {
      if (sessionStorage.getItem(reloadKey)) return;
      sessionStorage.setItem(reloadKey, "1");
    } catch {
      return;
    }

    // Page JS may have already decided to show the password gate.
    location.reload();
  });
}

function watchUrlChanges() {
  let lastUrl = window.location.href;

  const onUrlChange = () => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    applyPasswordFromStorage();
    requestInject();
  };

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    onUrlChange();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    onUrlChange();
  };

  window.addEventListener("popstate", onUrlChange);
}

applyPasswordFromStorage();
requestInject();
watchUrlChanges();
