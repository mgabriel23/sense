# Sense

A Chrome extension for developers: preview the site you're on across mobile, tablet, laptop, and desktop screen sizes side by side, in one click. No more manually resizing DevTools.

## Install (unpacked, until it's on the Chrome Web Store)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `sense` folder.
4. Pin the Sense icon to your toolbar (puzzle-piece icon → pin).

## Use it

1. Go to any `http(s)://` site.
2. Click the Sense toolbar icon.
3. A new tab opens showing the page rendered at four sizes at once: Mobile, Tablet, Laptop, and Desktop, each defaulting to a common size (375×667, 768×1024, 1366×768, 1920×1080).
4. Each card has a dropdown to swap in a specific device within that category (e.g. Mobile → iPhone 14, Pixel 7, Galaxy S21) without changing the others.
5. Edit the URL bar at the top and hit **View** to preview a different page, or **Reload** to refresh all four frames.

If the icon is clicked on a page that isn't `http(s)://` (like `chrome://` pages or a blank new tab), Sense opens with an empty URL bar so you can type one in manually.

## Why it asks for access to all sites

Many sites send headers (`X-Frame-Options`, `Content-Security-Policy: frame-ancestors`) that block being shown in an iframe at all. Sense uses a `declarativeNetRequest` rule to strip those headers, scoped with `initiatorDomains` to only the sub-frames created by Sense's own viewer tab — it has no effect on iframes anywhere else, including your normal browsing in other tabs.

## Known limitations (MVP)

- No scroll/click sync across frames yet — each preview is independent.
- Sites that redirect out of iframes via JavaScript (rather than headers) are blocked by the iframe `sandbox` attribute in most cases, but a few aggressive scripts may still show a blank frame.
- Device lists are fixed per category for now — custom sizes and a persisted "last used device" are a natural next step.

## Project structure

```
sense/
├── manifest.json              # MV3 config: permissions, icons, entry points
├── icons/                     # toolbar + store icons (16/48/128), generated — see tools/
├── src/
│   ├── background/            # service worker (type: module)
│   │   ├── index.js           # wires listeners — no logic of its own
│   │   ├── header-rules.js    # declarativeNetRequest rule that unblocks iframing
│   │   └── viewer-launcher.js # opens viewer.html for the clicked tab
│   └── viewer/                # the multi-screen preview page
│       ├── viewer.html
│       ├── viewer.css         # layout + theming (light/dark via CSS variables)
│       ├── main.js            # entry point: wires the toolbar UI to DeviceGrid
│       ├── devices.js         # device preset data (single source of truth)
│       ├── url.js             # URL parsing/validation
│       └── device-grid.js     # DeviceGrid: builds, scales, loads, reloads frames
└── tools/
    └── generate-icons.js      # regenerates icons/*.png from source (no binary-only assets)
```

Each background/viewer file has one job — e.g. to change device presets, edit only `devices.js`; to change how frames get unblocked, edit only `header-rules.js`.
