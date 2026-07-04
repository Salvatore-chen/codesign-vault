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

function renderList(prototypes) {
  listEl.innerHTML = "";

  if (!prototypes.length) {
    emptyStateEl.classList.remove("hidden");
    listEl.classList.add("hidden");
    return;
  }

  emptyStateEl.classList.add("hidden");
  listEl.classList.remove("hidden");

  prototypes.forEach((item) => {
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
    listEl.appendChild(li);
  });
}

async function init() {
  applyI18n();

  const prototypes = await getPrototypes();
  renderList(prototypes);

  document.getElementById("openOptions").addEventListener("click", openOptionsPage);
  document.getElementById("manageBtn").addEventListener("click", openOptionsPage);
  document.getElementById("addFirst").addEventListener("click", openOptionsToAdd);
}

init();
