# Changelog

All notable changes to Sense are documented here, newest first. Versions match the `version` field in `manifest.json` and the packages submitted to the Chrome Web Store.

## 1.0.2

No new permissions in this release — the manifest's `permissions`/`host_permissions` are unchanged from 1.0.1, so this update should not require re-justifying anything in the Privacy practices tab.

**Added**
- Orientation badge on every device card ("PORTRAIT"/"LANDSCAPE"), next to the size readout — states the current orientation in words, not just via the rotate button's icon.
- Toast notifications for success, warning, error, and loading states, with a distinct short sound per type (generated in-browser via the Web Audio API — no bundled audio files). Undo-capable actions (removing/resetting a device) show an inline Undo button on the toast instead of committing instantly.
- A "Loading previews…" / "Reloading previews…" toast while frames are (re)loading, dismissed automatically once every visible card has finished (or timed out).
- Settings (gear icon) button in the viewer toolbar — opens the Options page directly, without needing to go through the extensions menu.
- Empty-state message ("Enter a website URL above…") shown before a URL is loaded, instead of blank space.
- Category icons (mobile/tablet/laptop/desktop glyphs) on the category-toggle pills and on each section heading in Options, shared from one module so both pages stay in sync.
- A "Save all four screens" step added to the guided tour — the combined-export button existed since 1.0.1 but was never covered by the tour.

**Changed**
- New accent color (warm orange, `#a84908` light / `#fb923c` dark) replacing the previous indigo, applied consistently across buttons, the toolbar icon, and the Chrome Web Store icon.
- Button hierarchy reworked throughout: the primary action (View) stays the one filled/loud button; Reload/Export/Screenshot/Rotate stay bordered "real button" weight; low-frequency utility controls (theme toggle, tour help, settings) are now ghost-styled — no visible chrome until hovered/focused — so they no longer compete visually with the buttons users touch constantly.
- Options page redesigned: more generous spacing, section dividers, category icon badges, and the same button-hierarchy pass (Remove is now ghost + tints red on hover; "Reset all categories" is ghost since it's the most destructive, least-frequent action on the page).
- Device cards: more padding/spacing, a hover lift, and the Rotate/Screenshot buttons restyled as circular tonal-fill buttons instead of flat squares.
- Every icon-only button now shows a styled tooltip on keyboard focus, not just mouse hover (previously relied on the browser's native title tooltip, which only appears on hover).
- Tour script rewritten in simpler, shorter language throughout.

**Fixed**
- A CSS-only tooltip could push a hidden (opacity: 0) element past the browser window's right edge, forcing a permanent horizontal scrollbar on the viewer toolbar — tooltips on the rightmost toolbar icons now anchor to their own right edge instead of centering.
- Device-card tooltips (Rotate/Screenshot) could render underneath the live preview iframe, since a scaled/transformed iframe can composite above sibling overlays in Chrome regardless of z-index — those tooltips now open upward, away from the iframe, instead.
- Uneven spacing between the View and Reload buttons, and between the Remove button and the text next to it on the Options page (both were text/icon line-height mismatches, not spacing values).
- Screenshot/error feedback that previously vanished into the console (`console.warn` only) now also shows a toast, so failures are visible instead of silent.

**Accessibility**
- Form fields that relied on placeholder text alone now have proper accessible names (`aria-label`).
- The viewer's URL-error message is now announced to screen readers (`role="alert"`); it previously wasn't.
- Preview iframes removed from the keyboard tab order — Sense is a visual preview, not an interactive one, so there's no reason for Tab to descend into a previewed page's own controls.
- Verified WCAG contrast for every text/background color pairing used in the app, in both light and dark theme — all pass AA, most pass AAA.

**Housekeeping**
- Removed several unused CSS custom properties left over from earlier iterations (`--font-body`, an unused fluid type scale, `--space-9`, `--dur-slow`).
- Extracted two pieces of duplicated/inline logic in the viewer's entry point into named functions (`showLoadingToast`, `createCategoryToggle`) for readability.

## 1.0.1

- Added per-device and combined (all four cards) full-page screenshot export.
- Added a loading overlay per card and fixed a capture-blank timing issue.
- Added the first guided tour.
- Added a light/dark theme toggle; corrected initial theme contrast.
- Redesigned the header toolbar, category toggle pills, and devices-list dropdown.
- Changed the orientation and screenshot icons.
- New permissions added: `scripting`, `webNavigation` (needed for the full-page screenshot's height-measurement probe).

## 1.0.0

- Initial Chrome Web Store release: multi-device grid (Mobile/Tablet/Laptop/Desktop), per-category device picker, orientation flip, per-device screenshot, recent-URL history, category show/hide toggle, keyboard shortcut, persisted last URL and per-category device/orientation selection.
