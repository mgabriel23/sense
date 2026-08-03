// Cross-origin iframes block reading document.documentElement.scrollHeight
// from the parent page, so full-page capture needs this: inject a tiny probe
// into every preview sub-frame and report each one's own viewport size
// alongside its true content height. The caller matches results back to a
// specific device card by comparing width/height against what it set that
// card's iframe to — sidesteps needing to identify *which* frameId belongs
// to which card, which isn't reliably derivable (all four iframes share the
// same URL, so matching by frame order/URL doesn't disambiguate them).
//
// Frames are enumerated via webNavigation and explicitly listed rather than
// using executeScript's own `allFrames: true` — that implicitly targets the
// tab's main frame too, which here is Sense's own chrome-extension:// page.
// That origin isn't covered by the <all_urls> host permission the sub-frames
// rely on, and a single inaccessible frame fails the *entire* call, not just
// that one frame's result.
export async function measureFrames(tabId) {
  const allFrames = await chrome.webNavigation.getAllFrames({ tabId });
  const subFrameIds = (allFrames ?? []).filter((f) => f.frameId !== 0).map((f) => f.frameId);
  if (subFrameIds.length === 0) return [];

  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: subFrameIds },
    func: () => ({
      width: window.innerWidth,
      height: window.innerHeight,
      contentHeight: Math.max(
        document.documentElement?.scrollHeight || 0,
        document.body?.scrollHeight || 0,
        window.innerHeight
      ),
    }),
  });

  return results.map((r) => ({ frameId: r.frameId, ...r.result }));
}
