# Sense

A Chrome extension for developers: preview the site you're on across mobile, tablet, laptop, and desktop screen sizes side by side, in one click. No more manually resizing DevTools.

## Install (unpacked, until it's on the Chrome Web Store)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `sense` folder.
4. Pin the Sense icon to your toolbar (puzzle-piece icon → pin).

## Use it

1. Go to any `http(s)://` site.
2. Click the Sense toolbar icon, or press **Ctrl+Shift+Y** (**Cmd+Shift+Y** on Mac). Rebind it any time at `chrome://extensions/shortcuts`.
3. A new tab opens showing the page rendered at four sizes at once: Mobile, Tablet, Laptop, and Desktop, each defaulting to a common size (375×667, 768×1024, 1366×768, 1920×1080).
4. Each card has a dropdown to swap in a specific device within that category (e.g. Mobile → iPhone 14, Pixel 7, Galaxy S21) without changing the others.
5. The ⟳ button on each card flips that card between portrait and landscape — it's a per-card preference, so it carries over even if you then switch to a different device in the same category.
6. Edit the URL bar at the top and hit **View** to preview a different page, or **Reload** to refresh all four frames. Click into the URL bar to see a dropdown of your last 8 previewed URLs.
7. Reopening Sense (icon, shortcut, or a fresh tab with nothing to preview) restores the last URL and the last device + orientation picked per category — it doesn't start from scratch.
8. The ⬇ button on each card saves just that device's preview as a PNG — it scrolls the card into view first, screenshots the tab, and crops to that card, so it works even if the card isn't currently on screen (as long as it can fit within the browser window at all).
9. The row of pills below the toolbar (Mobile, Tablet, Laptop, Desktop) toggles which categories are shown — e.g. turn off Laptop and Desktop to preview only Mobile and Tablet. At least one stays on. This choice is remembered for next time.

If the icon is clicked on a page that isn't `http(s)://` (like `chrome://` pages or a blank new tab), Sense falls back to your last-previewed URL if there is one, or an empty URL bar otherwise.

If a frame never finishes loading (some sites block embedding without responding cleanly), that card shows "This site may not allow embedding" after 8 seconds instead of spinning forever.

## Customizing the device list

Right-click the Sense icon → **Options** (or `chrome://extensions` → Sense → **Extension options**) to add, remove, or reset the devices offered in each category. Changes save automatically and apply the next time you open a preview tab — a category always needs at least one device, so its last one can't be removed.

## Why it asks for access to all sites

Many sites send headers (`X-Frame-Options`, `Content-Security-Policy: frame-ancestors`) that block being shown in an iframe at all. Sense uses a `declarativeNetRequest` rule to strip those headers, scoped to only the specific tab a Sense preview is open in — it has no effect on any other tab, including your normal browsing. This also covers nested third-party iframes a previewed page embeds itself (an ad, a video embed, a widget) — those load inside the same preview tab, so they're unblocked too, not just the direct device-preview frames.

## Publishing to the Chrome Web Store

1. Create a one-time developer account at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 fee, paid once, ever).
2. Zip the contents of this folder so `manifest.json` sits at the **root** of the zip, not nested in a subfolder — the most common submission mistake. Excluding `.git/`, `tools/`, and `README.md` from the zip is optional; Chrome ignores files it doesn't recognize.
3. In the dashboard: **New Item** → upload the zip.
4. Fill in the store listing — a short description (the one in `manifest.json` works as-is), at least one screenshot (the four-device grid in action is the obvious choice), and a category (Developer Tools fits).
5. Fill in the **Privacy practices** tab — required given the `<all_urls>` host permission, even though Sense collects nothing. You'll need:
   - A one-sentence **single purpose** description (e.g. "Preview a website across multiple device sizes at once").
   - A justification for each permission: `declarativeNetRequestWithHostAccess` + `<all_urls>` (needed to strip iframe-blocking headers so arbitrary sites can be previewed) and `storage` (remembers the user's last URL, device/orientation choices, and category visibility locally).
   - A **privacy policy URL** — a one-paragraph hosted page (a GitHub Gist works) stating that Sense doesn't collect, transmit, or store any data outside the user's own browser is enough.
6. Submit for review. Broad host permissions are the most common rejection trigger — if rejected, the feedback will point at exactly which justification needs more detail; fix and resubmit the same package.
7. For updates later: bump `version` in `manifest.json`, re-zip, upload as a new package in the same dashboard item, resubmit.

## Known limitations (MVP)

- No scroll/click sync across frames — each preview is independent. (Tried a scroll-sync implementation via injected postMessage bridges; in practice it felt unpredictable across real sites, so it was dropped rather than shipped.)
- Sites that redirect out of iframes via JavaScript (rather than headers) are blocked by the iframe `sandbox` attribute in most cases, but a few aggressive scripts may still show a blank frame until the load-timeout message kicks in.
- Frames only emulate CSS viewport width/height — not touch input, device pixel ratio, or `pointer: coarse`, so code that branches on touch capability won't behave differently inside the "Mobile" frame.
- Text can look soft/blurry in cards with a large device-to-card size ratio (e.g. Desktop's 1920px squeezed into a ~340px card is a ~5.6x reduction) on a standard 1x display — a 22px font ends up rendering under 4 physical pixels tall, below what's legible regardless of anti-aliasing. This isn't fixable with CSS: verified by testing `zoom` in place of the `transform: scale()` used to shrink each card (identical result), plus `will-change`/`backface-visibility` GPU-layer hints and `image-rendering: crisp-edges` (neither changed anything) — the constraint is the display's actual pixel density, not the scaling method. The real fix (Chrome DevTools Protocol's `Emulation.setDeviceMetricsOverride`, which renders at a higher backing resolution) needs the `chrome.debugger` permission — a visible "being debugged" banner, much heavier Web Store review, and awkward fit for four independent sub-frames in one tab — so it's left as a known limitation rather than taken on for a cosmetic fix. Least noticeable on HiDPI/Retina displays, where more physical pixels are available to begin with.
- DevTools flags each preview frame with "An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing." This is a generic warning Chrome shows for that attribute combination on *any* iframe — it doesn't check whether the frame is actually cross-origin from its parent. Since every preview frame's origin (the previewed site) is never the same as Sense's own `chrome-extension://` origin, the escape it's warning about doesn't apply here. Dropping `allow-same-origin` would silence it, but at the cost of previewed sites losing access to their own cookies/localStorage (every preview would render logged-out) — not a trade worth making just to clear a console message, so it's left as a known, inapplicable warning.

## Project structure

```
sense/
├── manifest.json              # MV3 config: permissions, icons, entry points, commands
├── icons/                     # toolbar + store icons (16/48/128) — an original monitor-on-a-stand glyph, see tools/
├── src/
│   ├── background/            # service worker (type: module)
│   │   ├── index.js           # wires listeners — no logic of its own
│   │   ├── header-rules.js    # declarativeNetRequest rule that unblocks iframing
│   │   ├── viewer-launcher.js # opens viewer.html for the clicked tab
│   │   └── capture.js         # captures the visible tab for screenshot.js
│   ├── shared/                 # code used by more than one page
│   │   ├── theme.css          # design tokens + generic .btn styles
│   │   └── storage.js         # chrome.storage.local reads/writes (single source of key names)
│   ├── viewer/                 # the multi-screen preview page
│   │   ├── viewer.html
│   │   ├── viewer.css         # page-specific layout, imports shared/theme.css
│   │   ├── main.js            # entry point: wires the toolbar UI to DeviceGrid, restores state
│   │   ├── devices.js         # default device data (fallback/reset source of truth)
│   │   ├── url.js             # URL parsing/validation
│   │   ├── device-grid.js     # DeviceGrid: builds, scales, loads, reloads, times out frames
│   │   └── screenshot.js      # captures, crops to one card, and downloads a PNG
│   └── options/                # the "customize device list" page
│       ├── options.html
│       ├── options.css        # imports shared/theme.css
│       └── options.js         # add/remove/reset devices per category, persists via storage.js
└── tools/
    └── generate-icons.js      # draws the icon from plain rectangles and encodes the PNGs by hand — no source image, no dependencies
```

Each file has one job — e.g. to change default device sizes, edit only `devices.js`; to change how frames get unblocked, edit only `header-rules.js`; to change what's persisted, edit only `shared/storage.js`.
