const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

// Renders one scaled preview frame per device preset and keeps them sized to
// fit their grid cell. Iframes are built at zero size and only measured/sized
// during relayout(), so the grid's own track width is never inflated by a
// device's native (e.g. 1920px) dimensions before we've had a chance to scale it.
export class DeviceGrid {
  constructor(container, devices) {
    this.container = container;
    this.devices = devices;
    this.entries = this.devices.map((device) => this._createEntry(device));
  }

  _createEntry(device) {
    const card = document.createElement("section");
    card.className = "device-card";
    card.dataset.device = device.id;

    const label = document.createElement("div");
    label.className = "device-label";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = device.name;

    const sizeSpan = document.createElement("span");
    sizeSpan.textContent = `${device.width} × ${device.height}`;

    label.append(nameSpan, sizeSpan);

    const viewport = document.createElement("div");
    viewport.className = "frame-viewport";

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", IFRAME_SANDBOX);
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.title = `${device.name} preview`;
    iframe.addEventListener("load", () => viewport.classList.remove("is-loading"));

    viewport.appendChild(iframe);
    card.append(label, viewport);
    this.container.appendChild(card);

    return { device, card, viewport, iframe };
  }

  // Recomputes each frame's scale from its card's current width. Call on
  // resize, and whenever a frame is (re)loaded.
  relayout() {
    for (const { device, card, viewport, iframe } of this.entries) {
      const available = card.clientWidth;
      const scale = available > 0 ? Math.min(1, available / device.width) : 1;

      viewport.style.width = `${Math.round(device.width * scale)}px`;
      viewport.style.height = `${Math.round(device.height * scale)}px`;

      iframe.style.width = `${device.width}px`;
      iframe.style.height = `${device.height}px`;
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
