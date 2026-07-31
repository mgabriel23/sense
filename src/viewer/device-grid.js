const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

// Renders one scaled preview frame per category (Mobile/Tablet/Laptop/Desktop)
// and keeps it sized to fit its grid cell. Each card also has a dropdown to pick
// a specific device within that category; its first device is the default size.
// Iframes are built at zero size and only measured/sized during relayout(), so
// the grid's own track width is never inflated by a device's native (e.g. 1920px)
// dimensions before we've had a chance to scale it.
export class DeviceGrid {
  constructor(container, categories) {
    this.container = container;
    this.categories = categories;
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
    iframe.addEventListener("load", () => viewport.classList.remove("is-loading"));

    viewport.appendChild(iframe);
    card.append(label, viewport);
    this.container.appendChild(card);

    const entry = { category, currentDevice: category.devices[0], card, viewport, iframe, select };
    iframe.title = `${entry.currentDevice.name} preview`;

    select.addEventListener("change", () => {
      entry.currentDevice = category.devices.find((d) => d.id === select.value) || entry.currentDevice;
      iframe.title = `${entry.currentDevice.name} preview`;
      this.relayout();
    });

    return entry;
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

  // Points every frame at `url`, skipping frames already showing it.
  load(url) {
    for (const { viewport, iframe } of this.entries) {
      if (iframe.dataset.src !== url) {
        iframe.dataset.src = url;
        viewport.classList.add("is-loading");
        iframe.src = url;
      }
    }
    this.relayout();
  }

  // Forces every frame to re-navigate to its current URL. Toggling through
  // about:blank guarantees a fresh navigation even for cross-origin frames,
  // where we can't call contentWindow.location.reload() directly.
  reload() {
    for (const { viewport, iframe } of this.entries) {
      const url = iframe.dataset.src;
      if (!url) continue;

      viewport.classList.add("is-loading");
      iframe.src = "about:blank";
      requestAnimationFrame(() => {
        iframe.src = url;
      });
    }
  }
}
