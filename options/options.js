const modal = document.getElementById("modal");
const form = document.getElementById("prototypeForm");
const editIdInput = document.getElementById("editId");
const modalTitle = document.getElementById("modalTitle");
const nameInput = document.getElementById("prototypeName");
const urlInput = document.getElementById("prototypeUrl");
const passwordInput = document.getElementById("accessCode");
const projectSelect = document.getElementById("projectSelect");
const pasteArea = document.getElementById("pasteArea");
const parseStatus = document.getElementById("parseStatus");
const savedList = document.getElementById("savedList");
const savedEmpty = document.getElementById("savedEmpty");
const countBadge = document.getElementById("countBadge");
const submitBtn = document.getElementById("submitBtn");

const projectModal = document.getElementById("projectModal");
const projectForm = document.getElementById("projectForm");
const projectModalTitle = document.getElementById("projectModalTitle");
const projectNameInput = document.getElementById("projectNameInput");
const projectFormError = document.getElementById("projectFormError");
const projectSubmitBtn = document.getElementById("projectSubmitBtn");

/** @type {import('../shared/storage').Project[]} */
let currentProjects = [];
/** @type {import('../shared/storage').Prototype[]} */
let currentPrototypes = [];

/** @type {Set<string>} */
const collapsedProjectIds = new Set();

/** @type {{ type: "prototype" | "project", id: string } | null} */
let activeDrag = null;

/** @type {((value: string | null) => void) | null} */
let projectModalResolver = null;
/** @type {string | null} */
let projectModalExcludeId = null;

const DRAG_MIME = "application/x-codesign-vault";

function showParseStatus(message, isError = false) {
  parseStatus.textContent = message;
  parseStatus.classList.toggle("error", isError);
  parseStatus.classList.remove("hidden");
}

function hideParseStatus() {
  parseStatus.classList.add("hidden");
}

function applyParsedShare(parsed) {
  nameInput.value = parsed.name;
  urlInput.value = parsed.url;
  passwordInput.value = parsed.password;
  showParseStatus(t("parseRecognized", parsed.name));
}

function tryParseShareText(text) {
  if (!looksLikeCoDesignShareText(text)) {
    hideParseStatus();
    return null;
  }

  const parsed = parseCoDesignShareText(text);
  if (!parsed) {
    showParseStatus(t("parseFailed"), true);
    return null;
  }

  applyParsedShare(parsed);
  return parsed;
}

function fillProjectSelect(selectedId = "") {
  const value = selectedId || "";
  projectSelect.innerHTML = "";

  const ungrouped = document.createElement("option");
  ungrouped.value = "";
  ungrouped.textContent = t("ungrouped");
  projectSelect.appendChild(ungrouped);

  currentProjects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  });

  projectSelect.value = currentProjects.some((item) => item.id === value) ? value : "";
}

function resetForm() {
  editIdInput.value = "";
  form.reset();
  pasteArea.value = "";
  hideParseStatus();
  fillProjectSelect("");
  modalTitle.textContent = t("modalAddTitle");
  submitBtn.textContent = t("save");
}

function disableInputAutofill(...inputs) {
  inputs.forEach((input) => {
    input.setAttribute("readonly", "readonly");
    input.addEventListener(
      "focus",
      () => {
        input.removeAttribute("readonly");
      },
      { once: true }
    );
  });
}

function openModal(mode = "add", item = null) {
  resetForm();

  if (mode === "edit" && item) {
    editIdInput.value = item.id;
    nameInput.value = item.name;
    urlInput.value = item.url;
    passwordInput.value = item.password;
    fillProjectSelect(item.projectId || "");
    modalTitle.textContent = t("modalEditTitle");
    submitBtn.textContent = t("update");
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  disableInputAutofill(nameInput, urlInput, passwordInput, pasteArea);
  nameInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  resetForm();
}

async function openPrototype(url) {
  const normalizedUrl = normalizeUrl(url);
  if (!chrome.runtime?.id) return;

  await chrome.runtime.sendMessage({
    type: "OPEN_PROTOTYPE",
    url: normalizedUrl
  });
}

async function refreshState(projects, prototypes) {
  currentProjects = projects.sort(bySortOrder);
  currentPrototypes = prototypes.sort(bySortOrder);
  renderSavedList();
}

function isProjectNameTaken(name, excludeId = "") {
  const normalized = name.trim().toLowerCase();
  return currentProjects.some(
    (item) => item.id !== excludeId && item.name.toLowerCase() === normalized
  );
}

function showProjectFormError(message) {
  projectFormError.textContent = message;
  projectFormError.classList.remove("hidden");
}

function hideProjectFormError() {
  projectFormError.textContent = "";
  projectFormError.classList.add("hidden");
}

function closeProjectModal(result = null) {
  if (projectModal.classList.contains("hidden")) return;

  projectModal.classList.add("hidden");
  projectModal.setAttribute("aria-hidden", "true");
  hideProjectFormError();
  projectNameInput.value = "";
  projectModalExcludeId = null;

  if (modal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }

  const resolve = projectModalResolver;
  projectModalResolver = null;
  if (resolve) resolve(result);
}

/**
 * @param {{ mode: "add" | "rename", name?: string, excludeId?: string | null }} options
 * @returns {Promise<string | null>}
 */
function openProjectNameModal(options) {
  return new Promise((resolve) => {
    if (projectModalResolver) {
      projectModalResolver(null);
    }

    projectModalResolver = resolve;
    projectModalExcludeId = options.excludeId || null;
    projectModalTitle.textContent =
      options.mode === "rename" ? t("modalRenameProjectTitle") : t("modalAddProjectTitle");
    projectSubmitBtn.textContent = options.mode === "rename" ? t("update") : t("save");
    projectNameInput.value = options.name || "";
    hideProjectFormError();

    projectModal.classList.remove("hidden");
    projectModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      projectNameInput.focus();
      projectNameInput.select();
    });
  });
}

/**
 * @param {string} [defaultName]
 * @returns {Promise<import('../shared/storage').Project | null>}
 */
async function createProject(defaultName = "") {
  const name = await openProjectNameModal({ mode: "add", name: defaultName });
  if (!name) return null;

  const project = {
    id: generateId(),
    name,
    createdAt: Date.now(),
    sortOrder: nextSortOrder(currentProjects)
  };

  const nextProjects = reindexSortOrders([...currentProjects, project].sort(bySortOrder));
  await saveProjects(nextProjects);
  await refreshState(nextProjects, currentPrototypes);
  return project;
}

async function renameProject(project) {
  const name = await openProjectNameModal({
    mode: "rename",
    name: project.name,
    excludeId: project.id
  });
  if (!name || name === project.name) return;

  const nextProjects = currentProjects.map((item) =>
    item.id === project.id ? { ...item, name } : item
  );
  await saveProjects(nextProjects);
  await refreshState(nextProjects, currentPrototypes);
}

async function deleteProject(project) {
  const confirmed = confirm(t("deleteProjectConfirm", project.name));
  if (!confirmed) return;

  const nextProjects = reindexSortOrders(
    currentProjects.filter((item) => item.id !== project.id).sort(bySortOrder)
  );
  const nextPrototypes = reindexSortOrders(
    currentPrototypes
      .map((item) => (item.projectId === project.id ? { ...item, projectId: null } : item))
      .sort(bySortOrder)
  );

  await saveProjects(nextProjects);
  await savePrototypes(nextPrototypes);
  collapsedProjectIds.delete(project.id);
  await refreshState(nextProjects, nextPrototypes);
}

/**
 * @returns {{ key: string, project: import('../shared/storage').Project | null, items: import('../shared/storage').Prototype[] }[]}
 */
function buildGroupedSections() {
  /** @type {Map<string, import('../shared/storage').Prototype[]>} */
  const byProject = new Map();

  currentPrototypes.forEach((item) => {
    const key = item.projectId || "";
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(item);
  });

  /** @type {{ key: string, project: import('../shared/storage').Project | null, items: import('../shared/storage').Prototype[] }[]} */
  const sections = [];

  currentProjects.forEach((project) => {
    sections.push({
      key: project.id,
      project,
      items: (byProject.get(project.id) || []).sort(bySortOrder)
    });
  });

  const ungrouped = (byProject.get("") || []).sort(bySortOrder);
  if (ungrouped.length || currentProjects.length) {
    sections.push({
      key: "",
      project: null,
      items: ungrouped
    });
  }

  return sections;
}

/**
 * @param {string} dragId
 * @param {string | null} targetProjectId
 * @param {string | null} beforeId
 */
function movePrototypeTo(dragId, targetProjectId, beforeId) {
  const dragged = currentPrototypes.find((item) => item.id === dragId);
  if (!dragged) return null;

  const others = currentPrototypes.filter((item) => item.id !== dragId);
  /** @type {Map<string, import('../shared/storage').Prototype[]>} */
  const groups = new Map();

  currentProjects.forEach((project) => groups.set(project.id, []));
  groups.set("", []);

  others.forEach((item) => {
    const key =
      item.projectId && groups.has(item.projectId) ? item.projectId : "";
    groups.get(key).push(item);
  });

  for (const items of groups.values()) {
    items.sort(bySortOrder);
  }

  const targetKey = targetProjectId || "";
  if (!groups.has(targetKey)) groups.set(targetKey, []);
  const targetList = groups.get(targetKey);
  const moved = { ...dragged, projectId: targetProjectId || null };

  let insertAt = targetList.length;
  if (beforeId) {
    const idx = targetList.findIndex((item) => item.id === beforeId);
    if (idx >= 0) insertAt = idx;
  }
  targetList.splice(insertAt, 0, moved);

  /** @type {import('../shared/storage').Prototype[]} */
  const flat = [];
  currentProjects.forEach((project) => {
    flat.push(...(groups.get(project.id) || []));
  });
  flat.push(...(groups.get("") || []));

  return reindexSortOrders(flat);
}

/**
 * @param {string} dragId
 * @param {string | null} beforeProjectId
 */
function moveProjectTo(dragId, beforeProjectId) {
  const projects = [...currentProjects].sort(bySortOrder);
  const dragged = projects.find((item) => item.id === dragId);
  if (!dragged) return null;

  const rest = projects.filter((item) => item.id !== dragId);
  let insertAt = rest.length;
  if (beforeProjectId) {
    const idx = rest.findIndex((item) => item.id === beforeProjectId);
    if (idx >= 0) insertAt = idx;
  }
  rest.splice(insertAt, 0, dragged);
  return reindexSortOrders(rest);
}

function clearDragOver() {
  savedList.querySelectorAll(".drag-over, .drag-over-before, .drag-over-after").forEach((el) => {
    el.classList.remove("drag-over", "drag-over-before", "drag-over-after");
  });
}

function setDragPayload(event, payload) {
  activeDrag = payload;
  const raw = JSON.stringify(payload);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(DRAG_MIME, raw);
  event.dataTransfer.setData("text/plain", raw);
}

function readDragPayload(event) {
  const raw =
    event.dataTransfer.getData(DRAG_MIME) ||
    event.dataTransfer.getData("text/plain") ||
    (activeDrag ? JSON.stringify(activeDrag) : "");
  if (!raw) return activeDrag;

  try {
    return JSON.parse(raw);
  } catch {
    return activeDrag;
  }
}

function createDragHandle() {
  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.title = t("dragHint");
  handle.setAttribute("aria-hidden", "true");
  handle.textContent = "⋮⋮";
  return handle;
}

function createPrototypeRow(item) {
  const li = document.createElement("li");
  li.className = "saved-item";
  li.draggable = true;
  li.dataset.id = item.id;
  li.dataset.projectId = item.projectId || "";
  li.dataset.dropType = "prototype";

  const handle = createDragHandle();

  const main = document.createElement("div");
  main.className = "saved-main";

  const name = document.createElement("div");
  name.className = "saved-name";
  name.textContent = item.name;

  const meta = document.createElement("div");
  meta.className = "saved-meta";
  meta.textContent = item.url;

  main.append(name, meta);

  const actions = document.createElement("div");
  actions.className = "saved-actions";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "link-btn";
  openBtn.textContent = t("open");
  openBtn.addEventListener("click", () => openPrototype(item.url));

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "ghost-btn";
  editBtn.textContent = t("edit");
  editBtn.addEventListener("click", () => openModal("edit", item));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger-btn";
  deleteBtn.textContent = t("delete");
  deleteBtn.addEventListener("click", async () => {
    const confirmed = confirm(t("deleteConfirm", item.name));
    if (!confirmed) return;

    const next = reindexSortOrders(
      currentPrototypes.filter((entry) => entry.id !== item.id).sort(bySortOrder)
    );
    await savePrototypes(next);
    if (editIdInput.value === item.id) closeModal();
    await refreshState(currentProjects, next);
  });

  actions.append(openBtn, editBtn, deleteBtn);
  actions.addEventListener("mousedown", (event) => event.stopPropagation());

  li.append(handle, main, actions);

  li.addEventListener("dragstart", (event) => {
    if (event.target.closest(".saved-actions, button")) {
      event.preventDefault();
      return;
    }
    setDragPayload(event, { type: "prototype", id: item.id });
    li.classList.add("dragging");
  });

  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    activeDrag = null;
    clearDragOver();
  });

  li.addEventListener("dragover", (event) => {
    const payload = activeDrag || readDragPayload(event);
    if (!payload || payload.type !== "prototype" || payload.id === item.id) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDragOver();

    const rect = li.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    li.classList.add(before ? "drag-over-before" : "drag-over-after");
  });

  li.addEventListener("dragleave", () => {
    li.classList.remove("drag-over-before", "drag-over-after");
  });

  li.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const payload = readDragPayload(event);
    clearDragOver();
    if (!payload || payload.type !== "prototype" || payload.id === item.id) return;

    const rect = li.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    const targetProjectId = item.projectId || null;
    const sectionItems = currentPrototypes
      .filter((entry) => (entry.projectId || "") === (item.projectId || ""))
      .sort(bySortOrder)
      .filter((entry) => entry.id !== payload.id);

    let beforeId = null;
    if (before) {
      beforeId = item.id;
    } else {
      const idx = sectionItems.findIndex((entry) => entry.id === item.id);
      beforeId = idx >= 0 ? sectionItems[idx + 1]?.id || null : null;
    }

    const next = movePrototypeTo(payload.id, targetProjectId, beforeId);
    if (!next) return;
    await savePrototypes(next);
    await refreshState(currentProjects, next);
  });

  return li;
}

function bindGroupDropZone(el, projectId, collapseKey) {
  el.addEventListener("dragover", (event) => {
    const payload = activeDrag || readDragPayload(event);
    if (!payload) return;

    if (payload.type === "prototype") {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      el.classList.add("drag-over");
      if (collapsedProjectIds.has(collapseKey)) {
        collapsedProjectIds.delete(collapseKey);
        const group = el.closest(".project-group");
        if (group) group.classList.remove("collapsed");
      }
      return;
    }

    if (payload.type === "project" && projectId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      el.classList.add("drag-over");
    }
  });

  el.addEventListener("dragleave", (event) => {
    if (!el.contains(event.relatedTarget)) {
      el.classList.remove("drag-over");
    }
  });

  el.addEventListener("drop", async (event) => {
    const payload = readDragPayload(event);
    el.classList.remove("drag-over");
    if (!payload) return;

    if (payload.type === "prototype") {
      event.preventDefault();
      event.stopPropagation();
      const next = movePrototypeTo(payload.id, projectId, null);
      if (!next) return;
      await savePrototypes(next);
      await refreshState(currentProjects, next);
      return;
    }

    if (payload.type === "project" && projectId && payload.id !== projectId) {
      event.preventDefault();
      event.stopPropagation();

      const rect = el.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      const ordered = currentProjects.sort(bySortOrder).filter((item) => item.id !== payload.id);
      let beforeId = null;
      if (before) {
        beforeId = projectId;
      } else {
        const idx = ordered.findIndex((item) => item.id === projectId);
        beforeId = idx >= 0 ? ordered[idx + 1]?.id || null : null;
      }

      const nextProjects = moveProjectTo(payload.id, beforeId);
      if (!nextProjects) return;
      await saveProjects(nextProjects);
      await refreshState(nextProjects, currentPrototypes);
    }
  });
}

function renderSavedList() {
  savedList.innerHTML = "";
  countBadge.textContent = String(currentPrototypes.length);

  const hasContent = currentPrototypes.length > 0 || currentProjects.length > 0;
  savedEmpty.classList.toggle("hidden", hasContent);
  savedList.classList.toggle("hidden", !hasContent);

  if (!hasContent) return;

  const sections = buildGroupedSections();

  sections.forEach((section) => {
    const group = document.createElement("section");
    group.className = "project-group";
    group.dataset.projectId = section.key;

    const collapseKey = section.key || "__ungrouped__";
    const isCollapsed = collapsedProjectIds.has(collapseKey);
    if (isCollapsed) group.classList.add("collapsed");

    const header = document.createElement("div");
    header.className = "project-group-header";
    header.dataset.dropType = "group";

    if (section.project) {
      header.dataset.id = section.project.id;
    }

    const handle = createDragHandle();
    if (section.project) {
      handle.draggable = true;
      handle.addEventListener("dragstart", (event) => {
        event.stopPropagation();
        setDragPayload(event, { type: "project", id: section.project.id });
        group.classList.add("dragging");
      });
      handle.addEventListener("dragend", () => {
        group.classList.remove("dragging");
        activeDrag = null;
        clearDragOver();
      });
    } else {
      handle.classList.add("drag-handle-disabled");
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "project-group-toggle";
    toggleBtn.setAttribute("aria-expanded", String(!isCollapsed));

    const chevron = document.createElement("span");
    chevron.className = "project-group-chevron";
    chevron.textContent = "▾";

    const title = document.createElement("span");
    title.className = "project-group-title";
    title.textContent = section.project ? section.project.name : t("ungrouped");

    const count = document.createElement("span");
    count.className = "project-group-count";
    count.textContent = String(section.items.length);

    toggleBtn.append(chevron, title, count);
    toggleBtn.addEventListener("click", () => {
      if (collapsedProjectIds.has(collapseKey)) {
        collapsedProjectIds.delete(collapseKey);
      } else {
        collapsedProjectIds.add(collapseKey);
      }
      renderSavedList();
    });

    header.append(handle, toggleBtn);

    if (section.project) {
      const actions = document.createElement("div");
      actions.className = "project-group-actions";

      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "ghost-btn";
      renameBtn.textContent = t("renameProject");
      renameBtn.addEventListener("click", () => renameProject(section.project));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "danger-btn";
      deleteBtn.textContent = t("delete");
      deleteBtn.addEventListener("click", () => deleteProject(section.project));

      actions.append(renameBtn, deleteBtn);
      actions.addEventListener("mousedown", (event) => event.stopPropagation());
      header.appendChild(actions);
    }

    const list = document.createElement("ul");
    list.className = "project-group-list";
    list.dataset.projectId = section.key;

    if (!section.items.length) {
      const empty = document.createElement("li");
      empty.className = "project-group-empty";
      empty.textContent = t("dragDropHere");
      list.appendChild(empty);
    } else {
      section.items.forEach((item) => {
        list.appendChild(createPrototypeRow(item));
      });
    }

    const projectId = section.project ? section.project.id : null;
    bindGroupDropZone(header, projectId, collapseKey);
    bindGroupDropZone(list, projectId, collapseKey);

    group.append(header, list);
    savedList.appendChild(group);
  });
}

document.getElementById("addBtn").addEventListener("click", () => openModal("add"));
document.getElementById("emptyAddBtn").addEventListener("click", () => openModal("add"));

document.getElementById("addProjectBtn").addEventListener("click", () => createProject());
document.getElementById("emptyAddProjectBtn").addEventListener("click", () => createProject());

document.getElementById("createProjectInlineBtn").addEventListener("click", async () => {
  const project = await createProject();
  if (project) fillProjectSelect(project.id);
});

document.getElementById("exportBtn").addEventListener("click", async () => {
  if (!currentPrototypes.length && !currentProjects.length) {
    alert(t("exportEmpty"));
    return;
  }
  downloadExportFile(currentProjects, currentPrototypes);
});

const importFileInput = document.getElementById("importFile");

document.getElementById("importBtn").addEventListener("click", () => {
  importFileInput.value = "";
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;

  let imported;
  try {
    imported = await readImportFile(file);
  } catch {
    alert(t("importInvalid"));
    return;
  }

  let nextProjects = imported.projects;
  let nextPrototypes = imported.prototypes;

  if (currentPrototypes.length || currentProjects.length) {
    const merge = confirm(t("importMergeConfirm", String(imported.prototypes.length)));
    if (merge) {
      const mergedProjects = mergeProjects(currentProjects, imported.projects);
      nextProjects = mergedProjects.projects;
      nextPrototypes = mergePrototypes(
        currentPrototypes,
        imported.prototypes,
        mergedProjects.idMap
      );
    } else if (confirm(t("importReplaceConfirm", String(imported.prototypes.length)))) {
      nextProjects = imported.projects;
      nextPrototypes = imported.prototypes;
    } else {
      return;
    }
  }

  await saveProjects(nextProjects);
  await savePrototypes(nextPrototypes);
  await refreshState(nextProjects, nextPrototypes);
  alert(t("importSuccess", String(nextPrototypes.length)));
});

modal.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeModal);
});

projectModal.querySelectorAll("[data-close-project-modal]").forEach((el) => {
  el.addEventListener("click", () => closeProjectModal(null));
});

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = projectNameInput.value.trim();
  if (!name) {
    showProjectFormError(t("alertProjectNameRequired"));
    projectNameInput.focus();
    return;
  }

  if (isProjectNameTaken(name, projectModalExcludeId || "")) {
    showProjectFormError(t("alertProjectNameDuplicate"));
    projectNameInput.focus();
    projectNameInput.select();
    return;
  }

  closeProjectModal(name);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (!projectModal.classList.contains("hidden")) {
    closeProjectModal(null);
    return;
  }

  if (!modal.classList.contains("hidden")) {
    closeModal();
  }
});

pasteArea.addEventListener("paste", (event) => {
  const text = event.clipboardData?.getData("text") || "";
  if (!text) return;

  event.preventDefault();
  pasteArea.value = text;
  tryParseShareText(text);
});

pasteArea.addEventListener("input", () => {
  tryParseShareText(pasteArea.value);
});

urlInput.addEventListener("paste", (event) => {
  const text = event.clipboardData?.getData("text") || "";
  const parsed = tryParseShareText(text);
  if (parsed) {
    event.preventDefault();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const resolved = resolvePrototypeFormValues({
    pasteText: pasteArea.value,
    name: nameInput.value,
    url: urlInput.value,
    password: passwordInput.value
  });

  const name = resolved.name;
  const url = resolved.url;
  const password = resolved.password;
  const prototypeId = resolved.prototypeId || extractPrototypeId(url);
  const projectId = projectSelect.value || null;

  if (!name || !url) {
    alert(t("alertIncomplete"));
    return;
  }

  if (!prototypeId) {
    alert(t("alertInvalidUrl"));
    return;
  }

  const editingId = editIdInput.value;
  const duplicate = currentPrototypes.find(
    (item) => extractPrototypeId(item.url) === prototypeId && item.id !== editingId
  );

  if (duplicate) {
    alert(t("alertDuplicate"));
    return;
  }

  const existing = editingId
    ? currentPrototypes.find((item) => item.id === editingId)
    : null;

  const payload = {
    id: editingId || generateId(),
    name,
    url,
    password,
    projectId,
    createdAt: existing?.createdAt || Date.now(),
    sortOrder: existing?.sortOrder ?? nextSortOrder(currentPrototypes)
  };

  const next = reindexSortOrders(
    (editingId
      ? currentPrototypes.map((item) => (item.id === editingId ? payload : item))
      : [...currentPrototypes, payload]
    ).sort(bySortOrder)
  );

  await savePrototypes(next);
  closeModal();
  await refreshState(currentProjects, next);
});

async function init() {
  applyI18n();

  const [projects, prototypes] = await Promise.all([getProjects(), getPrototypes()]);
  await refreshState(projects, prototypes);

  const pending = await chrome.storage.session.get("openAddModal");
  if (pending.openAddModal) {
    await chrome.storage.session.remove("openAddModal");
    openModal("add");
  }
}

init();
