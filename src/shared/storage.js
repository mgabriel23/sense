// Single place both the viewer and the options page read/write persisted
// state through, so the chrome.storage.local key names only live in one file.
// Uses local (not sync) storage deliberately — previewed URLs can carry
// query params or paths a user wouldn't want leaving the machine via
// Chrome Sync.
const KEYS = {
  DEVICE_CATALOG: "deviceCatalog",
  LAST_URL: "lastUrl",
  DEVICE_SELECTION: "deviceSelection",
};

// chrome.storage can be unavailable (e.g. the "storage" permission hasn't
// taken effect yet because the unpacked extension was updated but not
// reloaded). Persistence is a nice-to-have here, not core functionality, so
// every function below fails soft — log a warning and fall back to "nothing
// saved" rather than throwing and taking the whole caller down with it.
function isStorageAvailable() {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

export async function getDeviceCatalog() {
  if (!isStorageAvailable()) return null;
  try {
    const result = await chrome.storage.local.get(KEYS.DEVICE_CATALOG);
    return result[KEYS.DEVICE_CATALOG] ?? null;
  } catch (error) {
    console.warn("Sense: couldn't read the device catalog from storage.", error);
    return null;
  }
}

export async function setDeviceCatalog(catalog) {
  if (!isStorageAvailable()) return;
  try {
    await chrome.storage.local.set({ [KEYS.DEVICE_CATALOG]: catalog });
  } catch (error) {
    console.warn("Sense: couldn't save the device catalog.", error);
  }
}

export async function getLastUrl() {
  if (!isStorageAvailable()) return "";
  try {
    const result = await chrome.storage.local.get(KEYS.LAST_URL);
    return result[KEYS.LAST_URL] ?? "";
  } catch (error) {
    console.warn("Sense: couldn't read the last URL from storage.", error);
    return "";
  }
}

export async function setLastUrl(url) {
  if (!isStorageAvailable()) return;
  try {
    await chrome.storage.local.set({ [KEYS.LAST_URL]: url });
  } catch (error) {
    console.warn("Sense: couldn't save the last URL.", error);
  }
}

// Per category: { deviceId, orientation }. Normalizes on the way out so
// callers never need to know that early versions of Sense saved a bare
// deviceId string here instead of an object.
export async function getDeviceSelection() {
  if (!isStorageAvailable()) return {};
  try {
    const result = await chrome.storage.local.get(KEYS.DEVICE_SELECTION);
    const raw = result[KEYS.DEVICE_SELECTION] ?? {};
    const normalized = {};
    for (const [categoryId, value] of Object.entries(raw)) {
      normalized[categoryId] = typeof value === "string" ? { deviceId: value } : value;
    }
    return normalized;
  } catch (error) {
    console.warn("Sense: couldn't read the device selection from storage.", error);
    return {};
  }
}

export async function setDeviceSelection(selection) {
  if (!isStorageAvailable()) return;
  try {
    await chrome.storage.local.set({ [KEYS.DEVICE_SELECTION]: selection });
  } catch (error) {
    console.warn("Sense: couldn't save the device selection.", error);
  }
}
