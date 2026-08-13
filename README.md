# Sense

> A developer-first Chrome extension that lets you preview the site you're on across mobile, tablet, laptop, and desktop viewports side by side with one click. No manual DevTools resizing required.

---

## Visual Preview

| Multi-Device Preview Grid | Device List Options Page |
| :---: | :---: |
| ![Sense Multi-Device Viewport Preview](https://github.com/mgabriel23/portfolio/blob/master/assets/sense-gallery-1.webp) | ![Sense Extension Options Page](https://github.com/mgabriel23/portfolio/blob/master/assets/sense-gallery-3.webp) |

---

## Features

* **Side-by-Side Viewports:** Instant 4-screen layout rendering Mobile, Tablet, Laptop, and Desktop viewports simultaneously.
* **Per-Card Device Swapping:** Toggle between popular presets (*iPhone 14, Pixel 7, Galaxy S21, iPad, MacBook, 1080p Desktop*) independently for each category.
* **Independent Orientation Toggles:** Rotate individual device cards between portrait and landscape modes with dedicated status badges.
* **Smart URL Navigation & History:** Edit the top URL bar to switch target pages, refresh all frames, or access a quick dropdown history of your last 8 previewed URLs.
* **Selective Category Filters:** Toggle visibility for specific device types (e.g., isolate Mobile and Tablet viewports).
* **High-Res Screenshot Export:** Capture and crop full-page or single-card PNG previews instantly with auto-scroll calculation.
* **Custom Device Manager:** Add, remove, or reset target devices per category via the options page.
* **Persistent Preferences:** Automatically saves and restores your last-used target URL, active device presets, orientations, and category visibility.
* **Iframe Header Unblocking:** Uses Chrome’s `declarativeNetRequest` engine to strip restrictive frame headers (`X-Frame-Options`, `Content-Security-Policy: frame-ancestors`) isolated to Sense preview tabs.
* **Keyboard Shortcut:** Launch the multi-screen viewer anytime via `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac).

---

## Tech Stack & Permissions

* **Core Engine:** HTML5, Modern CSS (Design Tokens, Flexbox/Grid), JavaScript (ES Modules).
* **Extension Standard:** Chrome Extension Manifest V3 (MV3 Service Workers).
* **Chrome APIs Used:**
  * `declarativeNetRequestWithHostAccess` + `<all_urls>`: Bypasses iframe embedding blocks per tab.
  * `storage`: Persists URLs, settings, and device presets locally.
  * `scripting` & `webNavigation`: Measures scroll heights across frame contexts for full-page screenshot exports.

---
