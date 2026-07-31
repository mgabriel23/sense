import { ensureHeaderStripRule } from "./header-rules.js";
import { openViewerForTab } from "./viewer-launcher.js";

// Re-registered on every service worker start (in addition to onInstalled/onStartup)
// because MV3 workers are terminated and restarted freely; dynamic rules must
// always be re-asserted rather than assumed to persist from a prior run.
ensureHeaderStripRule();

chrome.runtime.onInstalled.addListener(ensureHeaderStripRule);
chrome.runtime.onStartup.addListener(ensureHeaderStripRule);
chrome.action.onClicked.addListener(openViewerForTab);
