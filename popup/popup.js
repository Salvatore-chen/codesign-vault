const listEl = document.getElementById("prototypeList");
const emptyStateEl = document.getElementById("emptyState");

function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

async function openOptionsToAdd() {
  await chrome.storage.session.set({ openAddModal: true });
  openOptionsPage();
}

async function openPrototype(url) {
  const normalizedUrl = normalizeUrl(url);
  if (!chrome.runtime?.id) return;

  await chrome.runtime.sendMessage({
    type: "OPEN_PROTOTYPE",
    url: normalizedUrl
  });
}

/**
 * @param {import('../shared/storage').Project[]} projects
 * @param {import('../shared/storage').Prototype[]} prototypes
 */
function buildGroupedSections(projects, prototypes) {
  /** @type {Map<string, import('../shared/storage').Prototype[]>} */
  const byProject = new Map();

  prototypes.forEach((item) => {
    const key = item.projectId || "";
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(item);
  });

  /** @type {{ title: string, items: import('../shared/storage').Prototype[] }[]} */
  const sections = [];

  projects.forEach((project) => {
    const items = (byProject.get(project.id) || []).sort(bySortOrder);
    if (!items.length) return;
    sections.push({ title: project.name, items });
  });

  const ungrouped = (byProject.get("") || []).sort(bySortOrder);
  if (ungrouped.length) {
    sections.push({ title: t("ungrouped"), items: ungrouped });
  }

  return sections;
}

function createPrototypeItem(item) {
  const li = document.createElement("li");
  li.className = "prototype-item";

  const info = document.createElement("div");
  info.className = "prototype-info";

  const name = document.createElement("div");
  name.className = "prototype-name";
  name.textContent = item.name;

  const url = document.createElement("div");
  url.className = "prototype-url";
  url.textContent = item.url;

  info.append(name, url);

  const button = document.createElement("button");
  button.className = "open-btn";
  button.textContent = t("open");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    openPrototype(item.url);
  });

  li.addEventListener("click", () => openPrototype(item.url));
  li.append(info, button);
  return li;
}

/**
 * @param {import('../shared/storage').Project[]} projects
 * @param {import('../shared/storage').Prototype[]} prototypes
 */
function renderList(projects, prototypes) {
  listEl.innerHTML = "";

  if (!prototypes.length) {
    emptyStateEl.classList.remove("hidden");
    listEl.classList.add("hidden");
    return;
  }

  emptyStateEl.classList.add("hidden");
  listEl.classList.remove("hidden");

  const sections = buildGroupedSections(projects, prototypes);

  if (!projects.length) {
    sections.forEach((section) => {
      section.items.forEach((item) => {
        listEl.appendChild(createPrototypeItem(item));
      });
    });
    return;
  }

  sections.forEach((section) => {
    const group = document.createElement("li");
    group.className = "project-section";

    const title = document.createElement("div");
    title.className = "project-section-title";
    title.textContent = section.title;

    const nested = document.createElement("ul");
    nested.className = "project-section-list";
    section.items.forEach((item) => {
      nested.appendChild(createPrototypeItem(item));
    });

    group.append(title, nested);
    listEl.appendChild(group);
  });
}

async function init() {
  applyI18n();

  const [projects, prototypes] = await Promise.all([getProjects(), getPrototypes()]);
  renderList(projects, prototypes);

  document.getElementById("openOptions").addEventListener("click", openOptionsPage);
  document.getElementById("manageBtn").addEventListener("click", openOptionsPage);
  document.getElementById("addFirst").addEventListener("click", openOptionsToAdd);
}

init();
