const EXPORT_VERSION = 1;
const EXPORT_APP = "codesign-vault";

/**
 * @param {import('./storage').Prototype[]} prototypes
 */
function buildExportPayload(prototypes) {
  return {
    version: EXPORT_VERSION,
    app: EXPORT_APP,
    exportedAt: new Date().toISOString(),
    prototypes: prototypes.map(normalizePrototype)
  };
}

/**
 * @param {unknown} item
 * @returns {import('./storage').Prototype | null}
 */
function normalizePrototype(item) {
  if (!item || typeof item !== "object") return null;

  const record = /** @type {Record<string, unknown>} */ (item);
  const name = String(record.name || "").trim();
  const url = normalizeUrl(String(record.url || ""));
  const password = String(record.password || "").trim();
  const prototypeId = extractPrototypeId(url);

  if (!name || !url || !password || !prototypeId) return null;

  return {
    id: String(record.id || generateId()),
    name,
    url,
    password,
    createdAt: Number(record.createdAt) || Date.now()
  };
}

/**
 * @param {unknown} data
 * @returns {import('./storage').Prototype[]}
 */
function parseImportData(data) {
  let list = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object") {
    const record = /** @type {Record<string, unknown>} */ (data);
    if (Array.isArray(record.prototypes)) {
      list = record.prototypes;
    }
  }

  const normalized = list.map(normalizePrototype).filter(Boolean);
  return dedupeByPrototypeId(normalized);
}

/** @param {import('./storage').Prototype[]} prototypes */
function dedupeByPrototypeId(prototypes) {
  const map = new Map();

  for (const item of prototypes) {
    const prototypeId = extractPrototypeId(item.url);
    if (prototypeId) map.set(prototypeId, item);
  }

  return [...map.values()];
}

/**
 * @param {import('./storage').Prototype[]} existing
 * @param {import('./storage').Prototype[]} imported
 */
function mergePrototypes(existing, imported) {
  const map = new Map();

  for (const item of existing) {
    const prototypeId = extractPrototypeId(item.url);
    if (prototypeId) map.set(prototypeId, item);
  }

  for (const item of imported) {
    const prototypeId = extractPrototypeId(item.url);
    if (!prototypeId) continue;

    const prev = map.get(prototypeId);
    map.set(prototypeId, {
      ...item,
      id: prev?.id || item.id || generateId(),
      createdAt: prev?.createdAt || item.createdAt || Date.now()
    });
  }

  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * @param {import('./storage').Prototype[]} prototypes
 */
function downloadExportFile(prototypes) {
  const payload = buildExportPayload(prototypes);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `codesign-vault-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {File} file
 * @returns {Promise<import('./storage').Prototype[]>}
 */
function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const prototypes = parseImportData(data);
        if (!prototypes.length) {
          reject(new Error("empty"));
          return;
        }
        resolve(prototypes);
      } catch {
        reject(new Error("invalid"));
      }
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsText(file);
  });
}
