const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

// Some sites never fire `load` when embedding is blocked by something other
// than headers (e.g. a script that tears down the document instead of
// navigating away) — the sandbox stops them hijacking the parent, but the
// frame is just left blank forever with no signal. This bounds how long we
// wait before telling the user instead of showing "Loading…" indefinitely.
const LOAD_TIMEOUT_MS = 8000;

// Renders one scaled preview frame per category (Mobile/Tablet/Laptop/Desktop)
// and keeps it sized to fit its grid cell. Each card also has a dropdown to pick
// a specific device within that category; its first device is the default size.
// Iframes are built at zero size and only measured/sized during relayout(), so
// the grid's own track width is never inflated by a device's native (e.g. 1920px)
// dimensions before we've had a chance to scale it.
export class DeviceGrid {
  constructor(container, categories, { onDeviceChange } = {}) {
    this.container = container;
    this.categories = categories;
    this.onDeviceChange = onDeviceChange;
    this.entries = this.categories.map((category) => this._createEntry(category));
  }

  _createEntry(category) {
    const card = document.createElement("section");
    card.className = "device-card";
    card.dataset.category = category.id;

    const label = document.createElement("div");
    label.className = "device-label";

    const nameSpan = document.createElement("span");
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

    const viewport = document.createElement("div");
    viewport.className = "frame-viewport";

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", IFRAME_SANDBOX);
    iframe.setAttribute("referrerpolicy", "no-referrer");

    viewport.appendChild(iframe);
    card.append(label, viewport);
    this.container.appendChild(card);

    const entry = {
      category,
      currentDevice: category.devices[0],
      card,
      viewport,
      iframe,
      select,
      loadTimer: null,
    };

    iframe.title = `${entry.currentDevice.name} preview`;

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

    return entry;
  }

  _applyDevice(entry, device) {
    entry.currentDevice = device;
    entry.select.value = device.id;
    entry.iframe.title = `${device.name} preview`;
    this.relayout();
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

  // Recomputes each frame's scale from its card's current width, using
  // whichever device is currently selected for that category. Call on
  // resize, on device-select change, and whenever a frame is (re)loaded.
  relayout() {
    for (const { currentDevice, card, viewport, iframe } of this.entries) {
      const available = card.clientWidth;
      const scale = available > 0 ? Math.min(1, available / currentDevice.width) : 1;

      viewport.style.width = `${Math.round(currentDevice.width * scale)}px`;
      viewport.style.height = `${Math.round(currentDevice.height * scale)}px`;

      iframe.style.width = `${currentDevice.width}px`;
      iframe.style.height = `${currentDevice.height}px`;
      iframe.style.transform = `scale(${scale})`;
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
