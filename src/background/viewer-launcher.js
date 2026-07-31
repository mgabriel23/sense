const VIEWER_PAGE = "src/viewer/viewer.html";

function isPreviewable(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

// Opens the Sense viewer in a new tab, preloaded with the clicked tab's URL when
// it's something the viewer can actually embed (skips chrome:// pages, blank tabs, etc.).
export function openViewerForTab(tab) {
  const targetUrl = isPreviewable(tab.url) ? tab.url : "";
  const query = targetUrl ? `?url=${encodeURIComponent(targetUrl)}` : "";
  const viewerUrl = chrome.runtime.getURL(`${VIEWER_PAGE}${query}`);

  return chrome.tabs.create({ url: viewerUrl });
}
