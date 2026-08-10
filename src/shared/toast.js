import { playToastSound } from "./sound.js";

// Lightweight toast/snackbar shared by every page. One persistent
// aria-live container is created lazily and reused, so multiple toasts
// (e.g. removing two devices in a row) stack instead of replacing each other.
let container = null;

function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.className = "toast-container";
  // A single persistent live region, not one per toast — screen readers
  // announce content added inside it, which is the standard pattern for
  // transient status messages (WAI-ARIA APG "Alert and Message Dialogs").
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  document.body.appendChild(container);
  return container;
}

// One icon per variant so the type reads at a glance without relying on
// color alone (WCAG 1.4.1) — "default" (the options page's Undo
// confirmations) has none, since those are routine, frequent, and not
// really successes, warnings, or errors.
const ICONS = {
  success:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12.5 10.8 15.3 16 9.5"></polyline></svg>',
  warning:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 22 20.5H2z"></path><line x1="12" y1="9.5" x2="12" y2="14"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  error:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="14.5" y1="9.5" x2="9.5" y2="14.5"></line><line x1="9.5" y1="9.5" x2="14.5" y2="14.5"></line></svg>',
};

// Errors/warnings get more time on screen to actually be read; a plain
// success confirmation doesn't need to linger.
const DEFAULT_DURATIONS = { success: 4000, warning: 6500, error: 6500, default: 5000 };

// variant: "default" | "success" | "warning" | "error". actionLabel +
// onAction together add an undo/retry-style button; omit both for a plain
// confirmation toast.
export function showToast(message, { actionLabel, onAction, duration, variant = "default" } = {}) {
  const toast = document.createElement("div");
  toast.className = variant === "default" ? "toast" : `toast toast-${variant}`;

  const icon = ICONS[variant];
  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.className = "toast-icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.innerHTML = icon;
    toast.appendChild(iconEl);
  }

  const text = document.createElement("span");
  text.className = "toast-message";
  text.textContent = message;
  toast.appendChild(text);

  let dismissTimer;
  const dismiss = () => {
    clearTimeout(dismissTimer);
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };

  if (actionLabel && onAction) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () => {
      onAction();
      dismiss();
    });
    toast.appendChild(actionBtn);
  }

  getContainer().appendChild(toast);
  // Starts off-state then flips on next frame so the transition actually runs
  // (adding the class in the same tick it's inserted wouldn't animate).
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  dismissTimer = setTimeout(dismiss, duration ?? DEFAULT_DURATIONS[variant] ?? 5000);

  playToastSound(variant);

  return dismiss;
}
