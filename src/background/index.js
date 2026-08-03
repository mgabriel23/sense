import { removeHeaderStripRuleForTab } from "./header-rules.js";
import { openViewerForTab } from "./viewer-launcher.js";
import { captureVisibleTab } from "./capture.js";

// One-time cleanup of the old global dynamic rule from before header-stripping
// became per-tab (session-scoped) — dynamic rules persist across extension
// reloads/updates, so a stale copy would otherwise linger indefinitely.
chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] });

chrome.action.onClicked.addListener(openViewerForTab);

// Each viewer tab gets its own session-scoped header-strip rule (see
// header-rules.js); clean it up when the tab closes rather than leaking rules
// for the lifetime of the browser session.
chrome.tabs.onRemoved.addListener((tabId) => {
  removeHeaderStripRuleForTab(tabId).catch(() => {});
});

// Screenshot capture happens here rather than directly from the viewer page:
// chrome.tabs methods haven't been reliably callable from an extension page
// in practice, and sender.tab.windowId is always populated on an incoming
// message (permissions aside), which is exactly what's needed to know which
// window to capture.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "sense-capture-tab") return false;

  captureVisibleTab(sender.tab?.windowId)
    .then((dataUrl) => sendResponse({ dataUrl }))
    .catch((error) => sendResponse({ error: error.message }));
  return true;
});
