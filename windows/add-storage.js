const storageForm = document.querySelector("[data-storage-form]");
const storageProviderButtons = document.querySelectorAll("[data-storage-provider]");
const storageFields = document.querySelectorAll("[data-storage-field]");
const storageSecretGroups = document.querySelectorAll("[data-storage-secret]");
const storageMessage = document.querySelector("[data-storage-message]");
const storageTitle = document.querySelector("[data-storage-title]");

let storageFormMode = "sftp";
let editingStorageId = null;
let storageRequestInFlight = false;

function setStorageBusy(busy) {
  storageRequestInFlight = Boolean(busy);
  storageForm?.setAttribute("aria-busy", busy ? "true" : "false");
  document.querySelectorAll("button, input, select, textarea").forEach((control) => { control.disabled = Boolean(busy); });
}

function setMessage(message, tone = null) {
  if (!storageMessage) return;
  storageMessage.textContent = message;
  storageMessage.classList.toggle("is-ok", tone === "ok");
  storageMessage.classList.toggle("is-warn", tone === "warn");
}

function setStorageFormProvider(provider) {
  storageFormMode = provider === "local" ? "local" : "sftp";
  storageProviderButtons.forEach((button) => {
    const active = button.dataset.storageProvider === storageFormMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  storageFields.forEach((field) => {
    const key = field.dataset.storageField;
    const wrapper = field.closest(".settings-field");
    if (wrapper && key !== "name") {
      wrapper.hidden = storageFormMode === "local";
    }
  });
  syncStorageAuthFields();
}

function syncStorageAuthFields() {
  const authType = document.querySelector('[data-storage-field="authType"]')?.value || "password";
  storageSecretGroups.forEach((group) => {
    const kind = group.dataset.storageSecret;
    group.hidden = storageFormMode === "local" || (authType === "password" ? kind !== "password" : kind === "password");
  });
}

function clearStorageForm() {
  editingStorageId = null;
  storageFields.forEach((field) => {
    if (field.dataset.storageField === "port") field.value = "22";
    else if (field.dataset.storageField === "authType") field.value = "password";
    else if (field.dataset.storageField === "rootDirectory") field.value = "/home/container";
    else field.value = "";
  });
  if (storageTitle) storageTitle.textContent = "Add Storage";
  setStorageFormProvider("sftp");
  setMessage("Credentials are encrypted before being written to disk.");
}

function getStorageFormPayload() {
  const payload = { id: editingStorageId, provider: storageFormMode, type: storageFormMode };
  storageFields.forEach((field) => {
    payload[field.dataset.storageField] = field.value;
  });
  if (storageFormMode === "local") {
    payload.name = payload.name || "This Device";
  }
  return payload;
}

function loadConnection(connection = null) {
  clearStorageForm();
  if (connection && connection.id !== "local") {
    editingStorageId = connection.id;
    if (storageTitle) storageTitle.textContent = "Edit Storage";
    setStorageFormProvider(connection.provider || connection.type || "sftp");
    storageFields.forEach((field) => {
      const key = field.dataset.storageField;
      if (connection[key] !== undefined && connection[key] !== null) field.value = connection[key];
    });
    setMessage("Leave password/key blank to keep the saved secret.");
    syncStorageAuthFields();
  }
}

async function saveStorageConnection(event) {
  event?.preventDefault();
  const api = window.desktopApi;
  if (storageRequestInFlight || !api?.files) {
    setMessage("File service is unavailable.", "warn");
    return;
  }
  setMessage("Saving storage...");
  setStorageBusy(true);
  try {
    const result = await api.files.saveConnection(getStorageFormPayload());
    const connectionId = result.connection?.id || editingStorageId || null;
    setMessage("Storage saved.", "ok");
    await api.storageWindow?.saved?.({ connectionId });
  } catch (error) {
    setMessage(error?.message || "Storage connection could not be saved.", "warn");
  } finally {
    setStorageBusy(false);
  }
}

async function testStorageConnectionFromForm() {
  const api = window.desktopApi;
  if (storageRequestInFlight || !api?.files) {
    setMessage("File service is unavailable.", "warn");
    return;
  }
  setMessage("Testing connection...");
  setStorageBusy(true);
  try {
    const result = await api.files.testConnection(getStorageFormPayload());
    setMessage(result?.message || "Connection verified.", "ok");
  } catch (error) {
    setMessage(error?.message || "Connection test failed.", "warn");
  } finally {
    setStorageBusy(false);
  }
}

storageProviderButtons.forEach((button) => {
  button.addEventListener("click", () => setStorageFormProvider(button.dataset.storageProvider || "sftp"));
});

storageForm?.addEventListener("submit", saveStorageConnection);
document.querySelector('[data-storage-action="test"]')?.addEventListener("click", testStorageConnectionFromForm);
document.querySelector('[data-storage-action="cancel"]')?.addEventListener("click", () => window.desktopApi?.storageWindow?.close?.());
document.querySelector('[data-storage-field="authType"]')?.addEventListener("change", syncStorageAuthFields);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !storageRequestInFlight) window.desktopApi?.storageWindow?.close?.();
});

window.desktopApi?.storageWindow?.onInit?.((payload = {}) => {
  loadConnection(payload.connection || payload);
});

clearStorageForm();
