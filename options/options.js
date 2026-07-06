const modal = document.getElementById("modal");
const form = document.getElementById("prototypeForm");
const editIdInput = document.getElementById("editId");
const modalTitle = document.getElementById("modalTitle");
const nameInput = document.getElementById("prototypeName");
const urlInput = document.getElementById("prototypeUrl");
const passwordInput = document.getElementById("accessCode");
const pasteArea = document.getElementById("pasteArea");
const parseStatus = document.getElementById("parseStatus");
const savedList = document.getElementById("savedList");
const savedEmpty = document.getElementById("savedEmpty");
const countBadge = document.getElementById("countBadge");
const submitBtn = document.getElementById("submitBtn");

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

  if (!parsed.password) {
    showParseStatus(t("parseNeedPassword"), true);
    applyParsedShare(parsed);
    return parsed;
  }

  applyParsedShare(parsed);
  return parsed;
}

function resetForm() {
  editIdInput.value = "";
  form.reset();
  pasteArea.value = "";
  hideParseStatus();
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

function renderSavedList(prototypes) {
  savedList.innerHTML = "";
  countBadge.textContent = String(prototypes.length);

  const hasItems = prototypes.length > 0;
  savedEmpty.classList.toggle("hidden", hasItems);
  savedList.classList.toggle("hidden", !hasItems);

  prototypes.forEach((item) => {
    const li = document.createElement("li");
    li.className = "saved-item";

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

      const next = prototypes.filter((entry) => entry.id !== item.id);
      await savePrototypes(next);
      if (editIdInput.value === item.id) closeModal();
      renderSavedList(next);
    });

    actions.append(openBtn, editBtn, deleteBtn);
    li.append(main, actions);
    savedList.appendChild(li);
  });
}

document.getElementById("addBtn").addEventListener("click", () => openModal("add"));
document.getElementById("emptyAddBtn").addEventListener("click", () => openModal("add"));

document.getElementById("exportBtn").addEventListener("click", async () => {
  const prototypes = await getPrototypes();
  if (!prototypes.length) {
    alert(t("exportEmpty"));
    return;
  }
  downloadExportFile(prototypes);
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

  const existing = await getPrototypes();
  let next = imported;

  if (existing.length) {
    const merge = confirm(t("importMergeConfirm", String(imported.length)));
    if (merge) {
      next = mergePrototypes(existing, imported);
    } else if (confirm(t("importReplaceConfirm", String(imported.length)))) {
      next = imported;
    } else {
      return;
    }
  }

  await savePrototypes(next);
  renderSavedList(next);
  alert(t("importSuccess", String(next.length)));
});

modal.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
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

  if (!name || !url || !password) {
    alert(t("alertIncomplete"));
    return;
  }

  if (!prototypeId) {
    alert(t("alertInvalidUrl"));
    return;
  }

  const prototypes = await getPrototypes();
  const editingId = editIdInput.value;
  const duplicate = prototypes.find(
    (item) => extractPrototypeId(item.url) === prototypeId && item.id !== editingId
  );

  if (duplicate) {
    alert(t("alertDuplicate"));
    return;
  }

  const payload = {
    id: editingId || generateId(),
    name,
    url,
    password,
    createdAt: editingId
      ? prototypes.find((item) => item.id === editingId)?.createdAt || Date.now()
      : Date.now()
  };

  const next = editingId
    ? prototypes.map((item) => (item.id === editingId ? payload : item))
    : [payload, ...prototypes];

  await savePrototypes(next);
  closeModal();
  renderSavedList(next);
});

async function init() {
  applyI18n();

  const prototypes = await getPrototypes();
  renderSavedList(prototypes);

  const pending = await chrome.storage.session.get("openAddModal");
  if (pending.openAddModal) {
    await chrome.storage.session.remove("openAddModal");
    openModal("add");
  }
}

init();
