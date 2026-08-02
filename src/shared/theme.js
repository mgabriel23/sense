import { getTheme, setTheme } from "./storage.js";

const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function systemTheme() {
  return darkMediaQuery.matches ? "dark" : "light";
}

// Applies any explicitly-saved theme to <html> — call this on every page
// (viewer, options) so both stay in sync regardless of which one the toggle
// was clicked from. Leaves the attribute unset when following the OS, which
// is what lets theme.css's prefers-color-scheme rule keep driving it.
export async function applyStoredTheme() {
  const stored = await getTheme();
  if (stored) document.documentElement.dataset.theme = stored;
  return stored;
}

// Wires a toggle button to flip the theme, persist the choice, and keep its
// icon painted for the *current* theme (so it reads as a status indicator,
// same convention as the device-card orientation icon).
export function initThemeToggle(button, { lightIcon, darkIcon }) {
  // In-memory theme is the source of truth for toggling, updated
  // synchronously on click. Re-reading storage on every click instead would
  // race if the button were clicked again before the previous click's write
  // resolved — two clicks could both read the same stale value and land on
  // the same target rather than alternating. Storage is just where it's persisted.
  let current = null;

  function paint(theme) {
    button.innerHTML = theme === "dark" ? darkIcon : lightIcon;
    const next = theme === "dark" ? "light" : "dark";
    const label = `Switch to ${next} theme`;
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  getTheme().then((stored) => {
    current = stored ?? systemTheme();
    paint(current);
  });

  // Keeps the icon (and in-memory state) honest if the OS theme changes
  // while still on "auto" (no explicit choice saved yet).
  darkMediaQuery.addEventListener("change", async () => {
    const stored = await getTheme();
    if (!stored) {
      current = systemTheme();
      paint(current);
    }
  });

  button.addEventListener("click", () => {
    if (current === null) return; // initial storage read hasn't resolved yet
    current = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = current;
    paint(current);
    setTheme(current);
  });
}
