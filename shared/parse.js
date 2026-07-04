/** @param {string} text */
function normalizeShareText(text) {
  return (text || "").replace(/\u00a0/g, " ").replace(/\r/g, "").trim();
}

/** @param {string} urlOrText */
function extractPrototypeId(urlOrText) {
  const text = normalizeShareText(urlOrText);
  if (!text) return null;

  try {
    const match = new URL(normalizeUrl(text)).pathname.match(/\/(?:app\/)?s\/(\d+)/);
    if (match) return match[1];
  } catch {
    // Fall through to inline match.
  }

  const inline = text.match(/codesign\.qq\.com\/(?:app\/)?s\/(\d+)/i);
  return inline ? inline[1] : null;
}

/** @param {string} url */
function normalizeUrl(url) {
  const trimmed = normalizeShareText(url);
  if (!trimmed) return "";

  const urlMatch = trimmed.match(/https?:\/\/codesign\.qq\.com\/[^\s\u3000]+/i);
  const candidate = urlMatch ? urlMatch[0] : trimmed;
  const cleaned = candidate.replace(/[),.;，。；、]+$/, "");

  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^codesign\.qq\.com\//i.test(cleaned)) return `https://${cleaned}`;
  return cleaned;
}

/**
 * @param {string} text
 * @returns {{ name: string, url: string, password: string, prototypeId: string } | null}
 */
function parseCoDesignShareText(text) {
  const raw = normalizeShareText(text);
  if (!raw) return null;

  const urlMatch =
    raw.match(/https?:\/\/codesign\.qq\.com\/(?:app\/)?s\/\d+[^\s]*/i) ||
    raw.match(/codesign\.qq\.com\/(?:app\/)?s\/\d+[^\s]*/i);

  if (!urlMatch) return null;

  const url = normalizeUrl(urlMatch[0]);
  const prototypeId = extractPrototypeId(url);
  if (!prototypeId) return null;

  const passwordMatch = raw.match(/(?:访问密码|密码|Password)\s*[:：]?\s*([A-Za-z0-9]+)/i);
  const password = passwordMatch ? passwordMatch[1].trim() : "";

  const lines = raw.split(/\n/).map((line) => line.trim()).filter(Boolean);
  let name = "";

  for (const line of lines) {
    if (/codesign\.qq\.com/i.test(line)) continue;
    if (/(?:访问密码|密码|Password)\s*[:：]?/i.test(line)) continue;

    name = line
      .replace(/^【?\s*CoDesign\s*原型分享\s*】?\s*/i, "")
      .replace(/^\[?\s*CoDesign\s*Share\s*\]?\s*/i, "")
      .replace(/^【.*?】\s*/, "")
      .trim();
    if (name) break;
  }

  if (!name) {
    name = getDefaultPrototypeName(prototypeId);
  }

  return { name, url, password, prototypeId };
}

/** @param {string} prototypeId */
function getDefaultPrototypeName(prototypeId) {
  if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
    const localized = chrome.i18n.getMessage("defaultPrototypeName", [prototypeId]);
    if (localized) return localized;
  }
  return `Prototype ${prototypeId}`;
}

/** @param {string} text */
function looksLikeCoDesignShareText(text) {
  return /codesign\.qq\.com\/(?:app\/)?s\/\d+/i.test(normalizeShareText(text));
}

/**
 * @param {{ pasteText?: string, name?: string, url?: string, password?: string }} sources
 * @returns {{ name: string, url: string, password: string, prototypeId: string | null }}
 */
function resolvePrototypeFormValues(sources) {
  let name = normalizeShareText(sources.name || "");
  let url = normalizeUrl(sources.url || "");
  let password = normalizeShareText(sources.password || "");

  const candidates = [
    sources.pasteText,
    sources.url,
    [sources.name, sources.url, sources.password].filter(Boolean).join("\n")
  ]
    .map((item) => normalizeShareText(item || ""))
    .filter(Boolean);

  for (const text of candidates) {
    if (!looksLikeCoDesignShareText(text)) continue;

    const parsed = parseCoDesignShareText(text);
    if (!parsed?.url || !parsed?.password) continue;

    if (!name) name = parsed.name;
    if (!url) url = parsed.url;
    if (!password) password = parsed.password;
    break;
  }

  return {
    name,
    url,
    password,
    prototypeId: extractPrototypeId(url)
  };
}
