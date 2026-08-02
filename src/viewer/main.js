import { DEFAULT_DEVICE_CATEGORIES } from "./devices.js";
import { normalizeUrl } from "./url.js";
import { DeviceGrid } from "./device-grid.js";
import {
  getDeviceCatalog,
  getDeviceSelection,
  setDeviceSelection,
  getLastUrl,
  setLastUrl,
  getRecentUrls,
  addRecentUrl,
  getVisibleCategories,
  setVisibleCategories,
} from "../shared/storage.js";

const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");
const urlError = document.getElementById("url-error");
const gridEl = document.getElementById("grid");
const reloadBtn = document.getElementById("reload-all");
const recentUrlsMenu = document.getElementById("recent-urls-menu");
const categoryTogglesEl = document.getElementById("category-toggles");

// Checkmark drawn inside each category pill's leading indicator box — makes
// the pill read as a checkbox-style on/off control rather than just a color change.
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function showError(message) {
  urlError.textContent = message || "";
  urlError.hidden = !message;
}

async function main() {
  let recentUrls = [];

  function renderRecentUrls(urls) {
    recentUrls = urls;
    recentUrlsMenu.innerHTML = "";
    for (const url of urls) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = url;
      button.addEventListener("click", () => {
        hideRecentUrls();
        setUrl(url);
      });
      item.appendChild(button);
      recentUrlsMenu.appendChild(item);
    }
  }

  function showRecentUrls() {
    if (recentUrls.length > 0) recentUrlsMenu.hidden = false;
  }

  function hideRecentUrls() {
    recentUrlsMenu.hidden = true;
  }

  renderRecentUrls(await getRecentUrls());

  const storedCatalog = await getDeviceCatalog();
  const categories = storedCatalog && storedCatalog.length ? storedCatalog : DEFAULT_DEVICE_CATEGORIES;

  const grid = new DeviceGrid(gridEl, categories, {
    onDeviceChange: async (categoryId, deviceId) => {
      const selection = await getDeviceSelection();
      selection[categoryId] = { ...selection[categoryId], deviceId };
      setDeviceSelection(selection);
    },
    onOrientationChange: async (categoryId, orientation) => {
      const selection = await getDeviceSelection();
      selection[categoryId] = { ...selection[categoryId], orientation };
      setDeviceSelection(selection);
    },
  });

  const storedSelection = await getDeviceSelection();
  for (const [categoryId, saved] of Object.entries(storedSelection)) {
    if (saved.deviceId) grid.selectDevice(categoryId, saved.deviceId);
    if (saved.orientation) grid.selectOrientation(categoryId, saved.orientation);
  }

  const storedVisible = await getVisibleCategories();
  let visibleIds = new Set(storedVisible ?? categories.map((c) => c.id));
  grid.setVisibleCategories(storedVisible);

  categoryTogglesEl.innerHTML = "";
  for (const category of categories) {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "category-toggle";

    const check = document.createElement("span");
    check.className = "category-toggle-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = CHECK_ICON;

    const label = document.createElement("span");
    label.className = "category-toggle-label";
    label.textContent = category.name;

    toggleBtn.append(check, label);
    toggleBtn.setAttribute("aria-pressed", String(visibleIds.has(category.id)));

    toggleBtn.addEventListener("click", () => {
      const next = new Set(visibleIds);
      if (next.has(category.id)) {
        if (next.size === 1) return; // keep at least one category visible
        next.delete(category.id);
      } else {
        next.add(category.id);
      }
      visibleIds = next;
      toggleBtn.setAttribute("aria-pressed", String(next.has(category.id)));

      const idsArray = categories.map((c) => c.id).filter((id) => next.has(id));
      grid.setVisibleCategories(idsArray);
      setVisibleCategories(idsArray);
    });

    categoryTogglesEl.appendChild(toggleBtn);
  }

  let currentUrl = "";

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
    gridEl.hidden = !currentUrl;
    reloadBtn.disabled = !currentUrl;

    if (currentUrl) {
      grid.load(currentUrl);
      setLastUrl(currentUrl);
      addRecentUrl(currentUrl).then(renderRecentUrls);
    }
  }

  urlForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const normalized = normalizeUrl(urlInput.value);

    if (!normalized) {
      showError("Enter a valid URL, e.g. https://example.com");
      return;
    }

    showError("");
    hideRecentUrls();
    setUrl(normalized);
  });

  urlInput.addEventListener("focus", showRecentUrls);

  // Delayed so a click on a menu item (which blurs the input first) still
  // registers before the menu disappears.
  urlInput.addEventListener("blur", () => {
    setTimeout(hideRecentUrls, 150);
  });

  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideRecentUrls();
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
  } else {
    const lastUrl = await getLastUrl();
    if (lastUrl) setUrl(lastUrl);
  }

  urlInput.focus();
}

main();
