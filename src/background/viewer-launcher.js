import { addHeaderStripRuleForTab } from "./header-rules.js";

const VIEWER_PAGE = "src/viewer/viewer.html";

function isPreviewable(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

// Opens the Sense viewer in a new tab, preloaded with the clicked tab's URL when
// it's something the viewer can actually embed (skips chrome:// pages, blank tabs, etc.).
export async function openViewerForTab(tab) {
  const targetUrl = isPreviewable(tab.url) ? tab.url : "";
  const query = targetUrl ? `?url=${encodeURIComponent(targetUrl)}` : "";
  const viewerUrl = chrome.runtime.getURL(`${VIEWER_PAGE}${query}`);

  const newTab = await chrome.tabs.create({ url: viewerUrl });
  // Registered before the viewer page's own async setup ever touches an
  // iframe src, so the rule is always in place before it's needed.
  await addHeaderStripRuleForTab(newTab.id);
  return newTab;
}
