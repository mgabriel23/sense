// Category device glyphs shared by the viewer's category-toggle pills
// (main.js) and the options page's section headers (options.js) — one
// source so the two pages can't drift into showing different icons for
// the same category.
export const MOBILE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>';
export const TABLET_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>';
export const LAPTOP_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="11" rx="1.5"></rect><line x1="1" y1="18" x2="23" y2="18"></line></svg>';
export const DESKTOP_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="12" rx="1.5"></rect><line x1="12" y1="15" x2="12" y2="18"></line><line x1="8" y1="20" x2="16" y2="20"></line></svg>';

// Keyed by category id (see viewer/devices.js). Callers should fall back to
// something reasonable (e.g. no icon) for an id not in this map, rather
// than assuming every category always has one.
export const CATEGORY_ICONS = {
  mobile: MOBILE_ICON,
  tablet: TABLET_ICON,
  laptop: LAPTOP_ICON,
  desktop: DESKTOP_ICON,
};
