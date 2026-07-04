const STORAGE_KEY = "prototypes";

/**
 * @typedef {{ id: string, name: string, url: string, password: string, createdAt: number }} Prototype
 */

/** @returns {Promise<Prototype[]>} */
async function getPrototypes() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

/** @param {Prototype[]} prototypes */
async function savePrototypes(prototypes) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: prototypes });
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
