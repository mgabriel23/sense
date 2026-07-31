import { ensureHeaderStripRule } from "./header-rules.js";
import { openViewerForTab } from "./viewer-launcher.js";
import { captureVisibleTab } from "./capture.js";

// Re-registered on every service worker start (in addition to onInstalled/onStartup)
// because MV3 workers are terminated and restarted freely; dynamic rules must
// always be re-asserted rather than assumed to persist from a prior run.
ensureHeaderStripRule();

chrome.runtime.onInstalled.addListener(ensureHeaderStripRule);
chrome.runtime.onStartup.addListener(ensureHeaderStripRule);
chrome.action.onClicked.addListener(openViewerForTab);

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
