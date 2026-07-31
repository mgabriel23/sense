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
5. Edit the URL bar at the top and hit **View** to preview a different page, or **Reload** to refresh all four frames.
6. Reopening Sense (icon, shortcut, or a fresh tab with nothing to preview) restores the last URL and the last device picked per category — it doesn't start from scratch.

If the icon is clicked on a page that isn't `http(s)://` (like `chrome://` pages or a blank new tab), Sense falls back to your last-previewed URL if there is one, or an empty URL bar otherwise.

If a frame never finishes loading (some sites block embedding without responding cleanly), that card shows "This site may not allow embedding" after 8 seconds instead of spinning forever.

## Customizing the device list

Right-click the Sense icon → **Options** (or `chrome://extensions` → Sense → **Extension options**) to add, remove, or reset the devices offered in each category. Changes save automatically and apply the next time you open a preview tab — a category always needs at least one device, so its last one can't be removed.

## Why it asks for access to all sites

Many sites send headers (`X-Frame-Options`, `Content-Security-Policy: frame-ancestors`) that block being shown in an iframe at all. Sense uses a `declarativeNetRequest` rule to strip those headers, scoped with `initiatorDomains` to only the sub-frames created by Sense's own viewer tab — it has no effect on iframes anywhere else, including your normal browsing in other tabs.

## Known limitations (MVP)

- No scroll/click sync across frames yet — each preview is independent.
- Sites that redirect out of iframes via JavaScript (rather than headers) are blocked by the iframe `sandbox` attribute in most cases, but a few aggressive scripts may still show a blank frame until the load-timeout message kicks in.
- Frames only emulate CSS viewport width/height — not touch input, device pixel ratio, or `pointer: coarse`, so code that branches on touch capability won't behave differently inside the "Mobile" frame.

## Project structure

```
sense/
├── manifest.json              # MV3 config: permissions, icons, entry points, commands
├── icons/                     # toolbar + store icons (16/48/128), generated — see tools/
├── src/
│   ├── background/            # service worker (type: module)
│   │   ├── index.js           # wires listeners — no logic of its own
│   │   ├── header-rules.js    # declarativeNetRequest rule that unblocks iframing
│   │   └── viewer-launcher.js # opens viewer.html for the clicked tab
│   ├── shared/                 # code used by more than one page
│   │   ├── theme.css          # design tokens + generic .btn styles
│   │   └── storage.js         # chrome.storage.local reads/writes (single source of key names)
│   ├── viewer/                 # the multi-screen preview page
│   │   ├── viewer.html
│   │   ├── viewer.css         # page-specific layout, imports shared/theme.css
│   │   ├── main.js            # entry point: wires the toolbar UI to DeviceGrid, restores state
│   │   ├── devices.js         # default device data (fallback/reset source of truth)
│   │   ├── url.js             # URL parsing/validation
│   │   └── device-grid.js     # DeviceGrid: builds, scales, loads, reloads, times out frames
│   └── options/                # the "customize device list" page
│       ├── options.html
│       ├── options.css        # imports shared/theme.css
│       └── options.js         # add/remove/reset devices per category, persists via storage.js
└── tools/
    └── generate-icons.js      # regenerates icons/*.png from source (no binary-only assets)
```

Each file has one job — e.g. to change default device sizes, edit only `devices.js`; to change how frames get unblocked, edit only `header-rules.js`; to change what's persisted, edit only `shared/storage.js`.
