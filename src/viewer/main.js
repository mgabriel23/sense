import { DEVICE_CATEGORIES } from "./devices.js";
import { normalizeUrl } from "./url.js";
import { DeviceGrid } from "./device-grid.js";

const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");
const urlError = document.getElementById("url-error");
const emptyState = document.getElementById("empty-state");
const gridEl = document.getElementById("grid");
const reloadBtn = document.getElementById("reload-all");

const grid = new DeviceGrid(gridEl, DEVICE_CATEGORIES);
let currentUrl = "";

function showError(message) {
  urlError.textContent = message || "";
  urlError.hidden = !message;
}

function setUrl(url) {
  currentUrl = url || "";

  const next = new URL(location.href);
  if (currentUrl) {
    next.searchParams.set("url", currentUrl);
  } else {
    next.searchParams.delete("url");
  }
  history.replaceState(null, "", next.toString());

  urlInput.value = currentUrl;
  emptyState.hidden = Boolean(currentUrl);
  gridEl.hidden = !currentUrl;
  reloadBtn.disabled = !currentUrl;

  if (currentUrl) grid.load(currentUrl);
}

urlForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const normalized = normalizeUrl(urlInput.value);

  if (!normalized) {
    showError("Enter a valid URL, e.g. https://example.com");
    return;
  }

  showError("");
  setUrl(normalized);
});

reloadBtn.addEventListener("click", () => grid.reload());

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (currentUrl) grid.relayout();
  }, 120);
});

const initialParams = new URLSearchParams(location.search);
const rawInitialUrl = initialParams.get("url");
const normalizedInitialUrl = normalizeUrl(rawInitialUrl);

if (normalizedInitialUrl) {
  setUrl(normalizedInitialUrl);
} else if (rawInitialUrl) {
  showError("That page's address couldn't be previewed. Enter a URL manually.");
}

urlInput.focus();
