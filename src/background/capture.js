// Captures whatever's currently visible in the given window as a PNG data
// URL. This is pixel-based, so it works regardless of cross-origin iframes
// in the frame — unlike reading their DOM, grabbing what's already rendered
// on screen isn't restricted by the same-origin policy.
export async function captureVisibleTab(windowId) {
  return chrome.tabs.captureVisibleTab(windowId, { format: "png" });
}
