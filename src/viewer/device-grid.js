import { captureCard } from "./screenshot.js";
import { showToast } from "../shared/toast.js";

const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

// Some sites never fire `load` when embedding is blocked by something other
// than headers (e.g. a script that tears down the document instead of
// navigating away) — the sandbox stops them hijacking the parent, but the
// frame is just left blank forever with no signal. This bounds how long we
// wait before telling the user instead of showing "Loading…" indefinitely.
const LOAD_TIMEOUT_MS = 8000;

// Phone glyphs for the orientation button — the icon itself reflects the
// card's current orientation (rather than a generic rotate/reload arrow, which
// reads as "reload this frame" next to the toolbar's actual Reload button).
const PHONE_PORTRAIT_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>';
const PHONE_LANDSCAPE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"></rect><line x1="6" y1="11" x2="6" y2="13"></line></svg>';

// Camera glyph for the screenshot button — reads as "capture" at a glance,
// rather than the generic download arrow (⬇) it replaces.
const CAMERA_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';

// Swapped in for CAMERA_ICON while a capture is in flight — an open arc
// spun via the `.is-busy` CSS animation reads as a standard loading spinner.
const SPINNER_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10"></path></svg>';

// A device's stored width/height is its natural orientation (e.g. a phone is
// authored portrait, a desktop landscape). Toggling orientation swaps the two
// only when the requested orientation differs from that natural one.
function nativeOrientation(device) {
  return device.width <= device.height ? "portrait" : "landscape";
}

function effectiveDimensions(device, orientation) {
  if (nativeOrientation(device) === orientation) {
    return { width: device.width, height: device.height };
  }
  return { width: device.height, height: device.width };
}

// Renders one scaled preview frame per category (Mobile/Tablet/Laptop/Desktop)
// and keeps it sized to fit its grid cell. Each card has a dropdown to pick a
// specific device within that category (its first device is the default) and
// a rotate button to flip that card between portrait/landscape — orientation
// is a per-card preference, so it carries over even when the device is swapped.
// Iframes are built at zero size and only measured/sized during relayout(), so
// the grid's own track width is never inflated by a device's native (e.g. 1920px)
// dimensions before we've had a chance to scale it.
export class DeviceGrid {
  constructor(container, categories, { onDeviceChange, onOrientationChange, onBusyChange } = {}) {
    this.container = container;
    this.categories = categories;
    this.onDeviceChange = onDeviceChange;
    this.onOrientationChange = onOrientationChange;
    this.onBusyChange = onBusyChange;
    this.entries = this.categories.map((category) => this._createEntry(category));
  }

  _createEntry(category) {
    const card = document.createElement("section");
    card.className = "device-card";
    card.dataset.category = category.id;

    const label = document.createElement("div");
    label.className = "device-label";

    const nameSpan = document.createElement("span");
    nameSpan.className = "device-label-name";
    nameSpan.textContent = category.name;

    const select = document.createElement("select");
    select.className = "device-select";
    select.setAttribute("aria-label", `${category.name} device`);
    for (const device of category.devices) {
      const option = document.createElement("option");
      option.value = device.id;
      option.textContent = `${device.name} — ${device.width}×${device.height}`;
      select.appendChild(option);
    }

    label.append(nameSpan, select);

    const controls = document.createElement("div");
    controls.className = "device-controls";

    const sizeReadout = document.createElement("span");
    sizeReadout.className = "device-size-readout";

    // A word, not just the rotate button's icon — the icon alone (a phone
    // glyph drawn portrait- or landscape-shaped) reads clearly once you know
    // the convention, but a plain-language label next to it needs no
    // interpretation at a glance.
    const orientationLabel = document.createElement("span");
    orientationLabel.className = "device-orientation-label";

    const readout = document.createElement("div");
    readout.className = "device-readout";
    // Orientation leads the row — it's the thing worth noticing at a
    // glance; the exact pixel size next to it rewards a closer look.
    readout.append(orientationLabel, sizeReadout);

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "device-controls-buttons";

    const rotateBtn = document.createElement("button");
    rotateBtn.type = "button";
    rotateBtn.className = "btn icon-btn device-icon-btn rotate-btn";

    const screenshotBtn = document.createElement("button");
    screenshotBtn.type = "button";
    screenshotBtn.className = "btn icon-btn device-icon-btn screenshot-btn";
    screenshotBtn.innerHTML = CAMERA_ICON;
    screenshotBtn.title = "Save screenshot";
    screenshotBtn.setAttribute("aria-label", "Save screenshot");

    buttonGroup.append(rotateBtn, screenshotBtn);
    controls.append(readout, buttonGroup);

    const viewport = document.createElement("div");
    viewport.className = "frame-viewport";

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", IFRAME_SANDBOX);
    iframe.setAttribute("referrerpolicy", "no-referrer");
    // Sense is a visual preview, not an interactive one — there's no
    // workflow here that needs keyboard focus to land inside a previewed
    // page. Without this, a keyboard user tabbing past a card falls into
    // whatever the previewed site's own tab order is (its nav, its forms)
    // before reaching this card's own controls or the next card.
    iframe.tabIndex = -1;

    viewport.appendChild(iframe);
    card.append(label, controls, viewport);
    this.container.appendChild(card);

    const entry = {
      category,
      currentDevice: category.devices[0],
      orientation: nativeOrientation(category.devices[0]),
      card,
      viewport,
      iframe,
      select,
      sizeReadout,
      orientationLabel,
      rotateBtn,
      screenshotBtn,
      loadTimer: null,
    };

    iframe.title = `${entry.currentDevice.name} preview`;
    this._updateOrientationUI(entry);

    iframe.addEventListener("load", () => {
      clearTimeout(entry.loadTimer);
      viewport.classList.remove("is-loading", "load-timeout");
    });

    select.addEventListener("change", () => {
      const device = category.devices.find((d) => d.id === select.value);
      if (!device) return;
      this._applyDevice(entry, device);
      this.onDeviceChange?.(category.id, device.id);
    });

    rotateBtn.addEventListener("click", () => {
      entry.orientation = entry.orientation === "portrait" ? "landscape" : "portrait";
      this._updateOrientationUI(entry);
      this.relayout();
      this.onOrientationChange?.(category.id, entry.orientation);
    });

    screenshotBtn.addEventListener("click", async () => {
      this.setBusy(true);
      this.setCardCapturing(entry, true);
      try {
        await captureCard(entry);
        showToast(`Saved ${entry.currentDevice.name} screenshot`, { variant: "success" });
      } catch (error) {
        console.warn(`Sense: couldn't capture a screenshot of ${entry.currentDevice.name}.`, error);
        showToast(`Couldn't save the ${category.name} screenshot — try again.`, { variant: "error" });
      } finally {
        this.setCardCapturing(entry, false);
        this.setBusy(false);
      }
    });

    return entry;
  }

  _applyDevice(entry, device) {
    entry.currentDevice = device;
    entry.select.value = device.id;
    entry.iframe.title = `${device.name} preview`;
    this._updateOrientationUI(entry);
    this.relayout();
  }

  _updateOrientationUI(entry) {
    const dims = effectiveDimensions(entry.currentDevice, entry.orientation);
    entry.sizeReadout.textContent = `${dims.width} × ${dims.height}`;
    entry.orientationLabel.textContent =
      entry.orientation === "portrait" ? "Portrait" : "Landscape";

    entry.rotateBtn.innerHTML =
      entry.orientation === "portrait" ? PHONE_PORTRAIT_ICON : PHONE_LANDSCAPE_ICON;

    const nextOrientation = entry.orientation === "portrait" ? "landscape" : "portrait";
    const actionLabel = `Switch to ${nextOrientation}`;
    entry.rotateBtn.setAttribute("aria-label", actionLabel);
    entry.rotateBtn.title = actionLabel;
  }

  // Selects `deviceId` within `categoryId` without notifying onDeviceChange —
  // for restoring a previously-saved selection, not for a fresh user choice.
  // No-ops quietly if the category/device no longer exists (e.g. it was
  // removed via the options page since it was last saved).
  selectDevice(categoryId, deviceId) {
    const entry = this.entries.find((e) => e.category.id === categoryId);
    const device = entry?.category.devices.find((d) => d.id === deviceId);
    if (!entry || !device) return;
    this._applyDevice(entry, device);
  }

  // Restores a saved orientation for `categoryId` without notifying
  // onOrientationChange. No-ops on an invalid category/orientation.
  selectOrientation(categoryId, orientation) {
    const entry = this.entries.find((e) => e.category.id === categoryId);
    if (!entry || (orientation !== "portrait" && orientation !== "landscape")) return;
    entry.orientation = orientation;
    this._updateOrientationUI(entry);
    this.relayout();
  }

  // Shows only the categories in `categoryIds` (an array of category ids);
  // pass null/undefined to show all of them. Sets display via inline style
  // rather than the `hidden` attribute — `hidden` only hides through the
  // browser's default `[hidden] { display: none }` rule, which our own
  // `.device-card { display: flex }` (an author rule) outright overrides
  // regardless of specificity, so it wouldn't actually stick.
  setVisibleCategories(categoryIds) {
    const visible = categoryIds ? new Set(categoryIds) : null;
    for (const entry of this.entries) {
      const isVisible = !visible || visible.has(entry.category.id);
      entry.card.style.display = isVisible ? "" : "none";
    }
    this.relayout();
  }

  // Disables every card's device select/rotate/screenshot controls for the
  // duration of a capture — a screenshot temporarily resizes its card and
  // scrolls the whole page, so changing devices, rotating, or starting a
  // second capture in the meantime would corrupt whichever one is in
  // flight. Also notified outward via onBusyChange so the toolbar can
  // disable Reload/Export (reloading a frame mid-capture would too).
  setBusy(isBusy) {
    for (const entry of this.entries) {
      entry.select.disabled = isBusy;
      entry.rotateBtn.disabled = isBusy;
      entry.screenshotBtn.disabled = isBusy;
    }
    this.onBusyChange?.(isBusy);
  }

  // Visual "this card is being captured right now" state — an overlay plus
  // a spinner swapped in for that card's own camera icon. For the combined
  // export, called once per card in sequence as screenshot.js works through
  // them, which doubles as a progress indicator (the overlay visibly moves
  // from card to card) without needing a separate progress UI.
  setCardCapturing(entry, isCapturing) {
    entry.viewport.classList.toggle("is-capturing", isCapturing);
    entry.screenshotBtn.classList.toggle("is-busy", isCapturing);
    entry.screenshotBtn.innerHTML = isCapturing ? SPINNER_ICON : CAMERA_ICON;
  }

  // Recomputes each frame's scale from its card's current width, using
  // whichever device/orientation is currently selected for that category.
  // Call on resize, on device/orientation change, and whenever a frame is
  // (re)loaded.
  relayout() {
    for (const entry of this.entries) {
      const { currentDevice, orientation, card, viewport, iframe } = entry;
      const dims = effectiveDimensions(currentDevice, orientation);
      const available = card.clientWidth;
      const scale = available > 0 ? Math.min(1, available / dims.width) : 1;

      viewport.style.width = `${Math.round(dims.width * scale)}px`;
      viewport.style.height = `${Math.round(dims.height * scale)}px`;

      iframe.style.width = `${dims.width}px`;
      iframe.style.height = `${dims.height}px`;
      iframe.style.transform = `scale(${scale})`;

      // Exposed for screenshot.js, which needs to know the current scale
      // (and native, unscaled dims) to size a temporarily-expanded capture
      // and correctly map captured pixels back to CSS coordinates.
      entry.scale = scale;
      entry.nativeDims = dims;
    }
  }

  _navigate(entry, url) {
    clearTimeout(entry.loadTimer);
    entry.viewport.classList.remove("load-timeout");
    entry.viewport.classList.add("is-loading");
    entry.iframe.src = url;
    entry.loadTimer = setTimeout(() => {
      entry.viewport.classList.remove("is-loading");
      entry.viewport.classList.add("load-timeout");
    }, LOAD_TIMEOUT_MS);
  }

  // Points every frame at `url`, skipping frames already showing it.
  load(url) {
    for (const entry of this.entries) {
      if (entry.iframe.dataset.src !== url) {
        entry.iframe.dataset.src = url;
        this._navigate(entry, url);
      }
    }
    this.relayout();
  }

  // Forces every frame to re-navigate to its current URL. Toggling through
  // about:blank guarantees a fresh navigation even for cross-origin frames,
  // where we can't call contentWindow.location.reload() directly.
  reload() {
    for (const entry of this.entries) {
      const url = entry.iframe.dataset.src;
      if (!url) continue;

      entry.iframe.src = "about:blank";
      requestAnimationFrame(() => this._navigate(entry, url));
    }
  }
}
