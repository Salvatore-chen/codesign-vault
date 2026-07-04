/** @param {string} key @param {...string} substitutions */
function t(key, ...substitutions) {
  const message = chrome.i18n.getMessage(key, substitutions);
  return message || key;
}

function getDocumentLang() {
  const uiLang = chrome.i18n.getUILanguage();
  return uiLang.startsWith("zh") ? "zh-CN" : uiLang.split("-")[0] || "en";
}

function applyI18n(root = document) {
  document.documentElement.lang = getDocumentLang();

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });

  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  const titleEl = root.querySelector("title[data-i18n]");
  if (titleEl) {
    document.title = t(titleEl.dataset.i18n);
  }
}
