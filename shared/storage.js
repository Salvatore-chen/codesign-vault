const STORAGE_KEY = "prototypes";
const PROJECTS_KEY = "projects";

/**
 * @typedef {{ id: string, name: string, createdAt: number, sortOrder: number }} Project
 * @typedef {{
 *   id: string,
 *   name: string,
 *   url: string,
 *   password: string,
 *   createdAt: number,
 *   projectId: string | null,
 *   sortOrder: number
 * }} Prototype
 */

/**
 * @template {{ sortOrder?: number, createdAt?: number }} T
 * @param {T[]} list
 * @returns {(T & { sortOrder: number })[]}
 */
function withSortOrder(list) {
  return list.map((item, index) => {
    const sortOrder =
      typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
        ? item.sortOrder
        : typeof item.createdAt === "number"
          ? item.createdAt
          : index;
    return { ...item, sortOrder };
  });
}

/** @param {{ sortOrder: number }} a @param {{ sortOrder: number }} b */
function bySortOrder(a, b) {
  return a.sortOrder - b.sortOrder;
}

/** @returns {Promise<Prototype[]>} */
async function getPrototypes() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const list = result[STORAGE_KEY] || [];
  return withSortOrder(
    list.map((item) => ({
      ...item,
      projectId: item.projectId || null
    }))
  ).sort(bySortOrder);
}

/** @param {Prototype[]} prototypes */
async function savePrototypes(prototypes) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: prototypes });
}

/** @returns {Promise<Project[]>} */
async function getProjects() {
  const result = await chrome.storage.sync.get(PROJECTS_KEY);
  return withSortOrder(result[PROJECTS_KEY] || []).sort(bySortOrder);
}

/** @param {Project[]} projects */
async function saveProjects(projects) {
  await chrome.storage.sync.set({ [PROJECTS_KEY]: projects });
}

/** @param {{ sortOrder?: number }[]} items */
function nextSortOrder(items) {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => Number(item.sortOrder) || 0)) + 1;
}

/**
 * @template {{ sortOrder: number }} T
 * @param {T[]} items
 * @returns {T[]}
 */
function reindexSortOrders(items) {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
