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

function watchUrlChanges() {
  let lastUrl = window.location.href;

  const onUrlChange = () => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
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

requestInject();
watchUrlChanges();
