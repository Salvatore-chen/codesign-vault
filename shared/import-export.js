const EXPORT_VERSION = 2;
const EXPORT_APP = "codesign-vault";

/**
 * @param {import('./storage').Project[]} projects
 * @param {import('./storage').Prototype[]} prototypes
 */
function buildExportPayload(projects, prototypes) {
  const projectIds = new Set(projects.map((item) => item.id));

  return {
    version: EXPORT_VERSION,
    app: EXPORT_APP,
    exportedAt: new Date().toISOString(),
    projects: projects
      .map(normalizeProject)
      .filter(Boolean)
      .sort(bySortOrder),
    prototypes: prototypes
      .map((item) =>
        normalizePrototype(item, {
          validProjectIds: projectIds
        })
      )
      .filter(Boolean)
      .sort(bySortOrder)
  };
}

/**
 * @param {unknown} item
 * @returns {import('./storage').Project | null}
 */
function normalizeProject(item) {
  if (!item || typeof item !== "object") return null;

  const record = /** @type {Record<string, unknown>} */ (item);
  const name = String(record.name || "").trim();
  if (!name) return null;

  const createdAt = Number(record.createdAt) || Date.now();
  const sortOrder =
    typeof record.sortOrder === "number" && Number.isFinite(record.sortOrder)
      ? record.sortOrder
      : createdAt;

  return {
    id: String(record.id || generateId()),
    name,
    createdAt,
    sortOrder
  };
}

/**
 * @param {unknown} item
 * @param {{ validProjectIds?: Set<string> }} [options]
 * @returns {import('./storage').Prototype | null}
 */
function normalizePrototype(item, options = {}) {
  if (!item || typeof item !== "object") return null;

  const record = /** @type {Record<string, unknown>} */ (item);
  const name = String(record.name || "").trim();
  const url = normalizeUrl(String(record.url || ""));
  const password = String(record.password || "").trim();
  const prototypeId = extractPrototypeId(url);

  if (!name || !url || !prototypeId) return null;

  let projectId = record.projectId ? String(record.projectId) : null;
  if (projectId && options.validProjectIds && !options.validProjectIds.has(projectId)) {
    projectId = null;
  }

  const createdAt = Number(record.createdAt) || Date.now();
  const sortOrder =
    typeof record.sortOrder === "number" && Number.isFinite(record.sortOrder)
      ? record.sortOrder
      : createdAt;

  return {
    id: String(record.id || generateId()),
    name,
    url,
    password,
    createdAt,
    projectId,
    sortOrder
  };
}

/**
 * @param {unknown} data
 * @returns {{ projects: import('./storage').Project[], prototypes: import('./storage').Prototype[] }}
 */
function parseImportData(data) {
  let projectList = [];
  let prototypeList = [];

  if (Array.isArray(data)) {
    prototypeList = data;
  } else if (data && typeof data === "object") {
    const record = /** @type {Record<string, unknown>} */ (data);
    if (Array.isArray(record.projects)) {
      projectList = record.projects;
    }
    if (Array.isArray(record.prototypes)) {
      prototypeList = record.prototypes;
    }
  }

  const projects = reindexSortOrders(
    dedupeProjectsById(projectList.map(normalizeProject).filter(Boolean)).sort(bySortOrder)
  );
  const validProjectIds = new Set(projects.map((item) => item.id));
  const prototypes = reindexSortOrders(
    dedupeByPrototypeId(
      prototypeList
        .map((item) => normalizePrototype(item, { validProjectIds }))
        .filter(Boolean)
    ).sort(bySortOrder)
  );

  return { projects, prototypes };
}

/** @param {import('./storage').Project[]} projects */
function dedupeProjectsById(projects) {
  const map = new Map();
  for (const item of projects) {
    map.set(item.id, item);
  }
  return [...map.values()];
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
 * @param {import('./storage').Project[]} existing
 * @param {import('./storage').Project[]} imported
 * @returns {{ projects: import('./storage').Project[], idMap: Map<string, string> }}
 */
function mergeProjects(existing, imported) {
  const projects = [...existing].sort(bySortOrder);
  const byName = new Map(existing.map((item) => [item.name.toLowerCase(), item]));
  /** @type {Map<string, string>} */
  const idMap = new Map();
  let cursor = nextSortOrder(projects);

  for (const item of imported.sort(bySortOrder)) {
    const matched = byName.get(item.name.toLowerCase());
    if (matched) {
      idMap.set(item.id, matched.id);
      continue;
    }

    const next = {
      ...item,
      id: item.id || generateId(),
      createdAt: item.createdAt || Date.now(),
      sortOrder: cursor++
    };
    projects.push(next);
    byName.set(next.name.toLowerCase(), next);
    idMap.set(item.id, next.id);
  }

  return {
    projects: reindexSortOrders(projects.sort(bySortOrder)),
    idMap
  };
}

/**
 * @param {import('./storage').Prototype[]} existing
 * @param {import('./storage').Prototype[]} imported
 * @param {Map<string, string>} [projectIdMap]
 */
function mergePrototypes(existing, imported, projectIdMap = new Map()) {
  const map = new Map();

  for (const item of existing) {
    const prototypeId = extractPrototypeId(item.url);
    if (prototypeId) map.set(prototypeId, item);
  }

  let cursor = nextSortOrder(existing);

  for (const item of imported.sort(bySortOrder)) {
    const prototypeId = extractPrototypeId(item.url);
    if (!prototypeId) continue;

    const prev = map.get(prototypeId);
    const mappedProjectId = item.projectId
      ? projectIdMap.get(item.projectId) || item.projectId
      : null;

    if (prev) {
      map.set(prototypeId, {
        ...item,
        id: prev.id,
        createdAt: prev.createdAt,
        projectId: mappedProjectId,
        sortOrder: prev.sortOrder
      });
    } else {
      map.set(prototypeId, {
        ...item,
        id: item.id || generateId(),
        createdAt: item.createdAt || Date.now(),
        projectId: mappedProjectId,
        sortOrder: cursor++
      });
    }
  }

  return reindexSortOrders([...map.values()].sort(bySortOrder));
}

/**
 * @param {import('./storage').Project[]} projects
 * @param {import('./storage').Prototype[]} prototypes
 */
function downloadExportFile(projects, prototypes) {
  const payload = buildExportPayload(projects, prototypes);
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
 * @returns {Promise<{ projects: import('./storage').Project[], prototypes: import('./storage').Prototype[] }>}
 */
function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const imported = parseImportData(data);
        if (!imported.prototypes.length && !imported.projects.length) {
          reject(new Error("empty"));
          return;
        }
        resolve(imported);
      } catch {
        reject(new Error("invalid"));
      }
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsText(file);
  });
}
