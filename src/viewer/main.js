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
  getTourCompleted,
  setTourCompleted,
} from "../shared/storage.js";
import { applyStoredTheme, initThemeToggle } from "../shared/theme.js";
import { Tour } from "./tour.js";

const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");
const urlError = document.getElementById("url-error");
const gridEl = document.getElementById("grid");
const reloadBtn = document.getElementById("reload-all");
const recentUrlsMenu = document.getElementById("recent-urls-menu");
const categoryTogglesEl = document.getElementById("category-toggles");
const themeToggleBtn = document.getElementById("theme-toggle");
const tourHelpBtn = document.getElementById("tour-help");

// Checkmark drawn inside each category pill's leading indicator box — makes
// the pill read as a checkbox-style on/off control rather than just a color change.
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

const HISTORY_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15.5 14"></polyline></svg>';
const GO_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';

const SUN_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
const MOON_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

// Steps for the guided tour (see tour.js). target: null renders as a
// centered card instead of spotlighting an element. Device-card steps
// target the Mobile card specifically — all four work identically, so
// walking through one is enough rather than repeating it four times.
const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome to Sense",
    body: "Preview any website at four sizes side by side — no more manually resizing DevTools. Here's a quick look at what's on screen.",
  },
  {
    target: "#url-input",
    title: "Enter a URL",
    body: "Type or paste any website address here. Click into the box any time to revisit your last 8 previewed links.",
  },
  {
    target: ".url-form .btn-primary",
    title: "Load the preview",
    body: "Click View (or just press Enter) to render the page across all four screens at once.",
  },
  {
    target: "#reload-all",
    title: "Reload everything",
    body: "Refreshes all four previews together — handy after the page you're testing changes.",
  },
  {
    target: "#theme-toggle",
    title: "Light or dark",
    body: "Switches Sense's own theme. Your choice is remembered for next time.",
  },
  {
    target: ".category-toggles",
    title: "Show or hide sizes",
    body: "Click a pill to hide that size category, or bring it back. At least one always stays visible.",
  },
  {
    target: '.device-card[data-category="mobile"] .device-select',
    title: "Pick a device",
    body: "Each card can show a specific device within its category — e.g. swap this from iPhone SE to Pixel 7 — without affecting the other three cards.",
  },
  {
    target: '.device-card[data-category="mobile"] .rotate-btn',
    title: "Rotate a card",
    body: "Flips this card between portrait and landscape. It's remembered per card, even if you switch to a different device afterward.",
  },
  {
    target: '.device-card[data-category="mobile"] .screenshot-btn',
    title: "Save a screenshot",
    body: "Downloads just this card's preview as a PNG — it scrolls the card into view first if it isn't already visible.",
  },
  {
    target: null,
    title: "You're all set",
    body: "Reopen this tour anytime from the (?) icon in the toolbar.",
  },
];

function showError(message) {
  urlError.textContent = message || "";
  urlError.hidden = !message;
}

async function main() {
  await applyStoredTheme();
  initThemeToggle(themeToggleBtn, { lightIcon: SUN_ICON, darkIcon: MOON_ICON });

  let recentUrls = [];

  // Splits a URL into its hostname (always shown in full, bold) and the
  // rest (path/query, muted, truncated) — makes the list scannable by site
  // at a glance instead of reading each full string left to right.
  function splitUrlForDisplay(url) {
    try {
      const parsed = new URL(url);
      const rest = parsed.pathname === "/" ? "" : parsed.pathname + parsed.search;
      return { host: parsed.hostname, rest };
    } catch {
      return { host: url, rest: "" };
    }
  }

  function renderRecentUrls(urls) {
    recentUrls = urls;
    recentUrlsMenu.innerHTML = "";
    for (const url of urls) {
      const { host, rest } = splitUrlForDisplay(url);

      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";

      const icon = document.createElement("span");
      icon.className = "recent-url-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = HISTORY_ICON;

      const text = document.createElement("span");
      text.className = "recent-url-text";

      const domain = document.createElement("span");
      domain.className = "recent-url-domain";
      domain.textContent = host;

      const path = document.createElement("span");
      path.className = "recent-url-path";
      path.textContent = rest;

      text.append(domain, path);

      const goIcon = document.createElement("span");
      goIcon.className = "recent-url-go";
      goIcon.setAttribute("aria-hidden", "true");
      goIcon.innerHTML = GO_ICON;

      button.append(icon, text, goIcon);
      button.addEventListener("click", () => {
        hideRecentUrls();
        setUrl(url);
      });

      // Simple linear focus navigation between menu items, entered from the
      // URL input via ArrowDown below — keeps the list comfortable to use
      // from the keyboard, not just the mouse.
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          // Order matters: focusing the input fires its own "focus" listener
          // (showRecentUrls), which would re-open the menu if this ran second.
          urlInput.focus();
          hideRecentUrls();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          const next = item.nextElementSibling?.querySelector("button");
          next?.focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          const prev = item.previousElementSibling?.querySelector("button");
          if (prev) prev.focus();
          else urlInput.focus();
        }
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

  // Delayed, and checks where focus actually landed, so moving focus INTO
  // the menu — via a mouse click or via ArrowDown below — doesn't get
  // closed out from under the user by this same blur handler.
  urlInput.addEventListener("blur", () => {
    setTimeout(() => {
      if (!recentUrlsMenu.contains(document.activeElement)) hideRecentUrls();
    }, 150);
  });

  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideRecentUrls();
    } else if (event.key === "ArrowDown" && !recentUrlsMenu.hidden) {
      event.preventDefault();
      recentUrlsMenu.querySelector("button")?.focus();
    }
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

  // A few tour steps target controls inside the device grid, which stays
  // hidden until a URL is loaded — reveal it for the tour's duration if
  // needed, and only re-hide it afterward if the user still hasn't entered
  // one by the time the tour ends.
  function runTour() {
    const gridWasHidden = gridEl.hidden;
    if (gridWasHidden) {
      gridEl.hidden = false;
      grid.relayout();
    }

    new Tour(TOUR_STEPS, {
      onFinish: () => {
        setTourCompleted(true);
        if (gridWasHidden && !currentUrl) gridEl.hidden = true;
      },
    }).start();
  }

  tourHelpBtn.addEventListener("click", runTour);

  if (!(await getTourCompleted())) {
    runTour();
  }
}

main();
