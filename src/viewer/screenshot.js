// Captures a device card's FULL scrollable page (not just what fits in its
// normal viewport height) and downloads it as a PNG, plus a combined mode
// that stitches every visible card into one wide image.
//
// Each preview is a cross-origin iframe, so its true content height can't be
// read directly from the parent page — background/frame-height.js injects a
// tiny probe into every frame of the tab and reports each one's own
// viewport size and content height; matchFrameHeight() below matches a
// card to its result by comparing native width/height (with tolerance, to
// allow for a scrollbar shaving a few px off one dimension), since all four
// cards share the same URL and can't otherwise be told apart.
//
// Capturing the extra height works by temporarily growing the iframe/
// viewport to the full content height, then scrolling the OUTER page in
// increments — chrome.tabs.captureVisibleTab only ever captures what's
// currently on screen, so there's no way around multiple shots stitched
// together for anything taller than one browser window.

// Caps how much extra a page can extend a capture beyond its device's native
// height, as a multiple of that height rather than a flat pixel value — so
// Mobile and Desktop get proportionally similar limits instead of one fixed
// number that's generous for one and enormous for the other. Without this,
// infinite-scroll/lazy-loaded pages that keep reporting a growing
// scrollHeight would produce an unusably long capture.
const MAX_CAPTURE_MULTIPLIER = 4;
const COMBINED_GAP = 16;

// How long to wait after scrolling before treating a slice as ready to
// capture. Longer than a couple of animation frames on purpose: lazy-loaded
// content (images, feed items, API-backed grids like YouTube's) typically
// starts fetching only once it scrolls into view, and a real network fetch
// takes much longer than a frame or two — capturing too early bakes in
// blank placeholders that finish loading a moment later, showing up as
// empty gaps once stitched together.
const SETTLE_DELAY_MS = 900;

// The priming pass (see captureMultiShot) scrolls through once specifically
// to trigger scroll-into-view lazy loads before the real capture starts —
// that head start is wasted if this is too short, since content triggered
// late in the sweep barely gets more time than a real capture step would've
// given it anyway.
const PRIME_STEP_DELAY_MS = 200;

export async function captureCard(entry) {
  const canvas = await captureCardCanvas(entry);
  downloadCanvas(canvas, screenshotFilename(entry));
}

export async function captureAllCards(entries, { onCardStart, onCardEnd } = {}) {
  const visible = entries.filter((entry) => entry.card.style.display !== "none");
  const canvases = [];
  // Sequential, not parallel — each capture scrolls the outer page and
  // temporarily resizes its own card, which would interfere with any other
  // capture running at the same time. onCardStart/onCardEnd let the caller
  // show which card is currently being worked on, doubling as a progress
  // indicator for what would otherwise be a long, silent wait.
  for (const entry of visible) {
    onCardStart?.(entry);
    try {
      canvases.push(await captureCardCanvas(entry));
    } finally {
      onCardEnd?.(entry);
    }
  }
  downloadCanvas(combineHorizontally(canvases), "sense-all-screens.png");
}

async function captureCardCanvas(entry) {
  const dims = entry.nativeDims ?? entry.currentDevice;
  const fullHeight = await measureFullContentHeight(dims);

  if (fullHeight <= dims.height) {
    return captureSingleShot(entry);
  }
  return captureMultiShot(entry, dims, fullHeight);
}

async function measureFullContentHeight(dims) {
  const maxHeight = dims.height * MAX_CAPTURE_MULTIPLIER;
  try {
    const response = await chrome.runtime.sendMessage({ type: "sense-measure-frames" });
    const frames = response?.frames ?? [];
    const withinTolerance = (a, b) => Math.abs(a - b) < 20;
    const match =
      frames.find((f) => withinTolerance(f.width, dims.width) && withinTolerance(f.height, dims.height)) ??
      frames.find((f) => withinTolerance(f.height, dims.height)) ??
      frames.find((f) => withinTolerance(f.width, dims.width));
    if (match) return Math.min(match.contentHeight, maxHeight);
  } catch (error) {
    console.warn("Sense: couldn't measure the full page height, falling back to a viewport-only capture.", error);
  }
  return dims.height;
}

async function captureSingleShot(entry) {
  entry.viewport.scrollIntoView({ block: "center", inline: "center" });
  await waitForNextPaint();
  const image = await captureVisibleTabImage(entry.viewport);
  return cropToRect(image, entry.viewport.getBoundingClientRect());
}

async function captureMultiShot(entry, dims, fullHeight) {
  const { iframe, viewport } = entry;
  const scale = entry.scale ?? 1;
  const originalIframeHeight = iframe.style.height;
  const originalViewportHeight = viewport.style.height;
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  try {
    const scaledHeight = Math.round(fullHeight * scale);
    iframe.style.height = `${fullHeight}px`;
    viewport.style.height = `${scaledHeight}px`;
    await waitForNextPaint();

    const toolbar = document.querySelector(".toolbar");
    const topBound = () => (toolbar ? toolbar.getBoundingClientRect().bottom : 0);

    // The card's position in the *document* (not the current scroll-relative
    // viewport) doesn't change as the page scrolls, so it's a stable anchor
    // for positioning every capture by absolute scroll target instead of
    // repeatedly scrolling "by how much was visible last time." That relative
    // approach breaks the moment the card's natural top (used for the very
    // first, unscrolled capture) differs from the sticky toolbar's bottom
    // edge (used for every capture after that) — two different reference
    // points that don't line up, so scrolling by "what the first capture
    // showed" overshoots or undershoots where the second one actually starts,
    // capturing (or skipping) a band of content at the seam.
    const cardDocumentTop = viewport.getBoundingClientRect().top + window.scrollY;

    function scrollToContentOffset(offset) {
      window.scrollTo(0, cardDocumentTop - topBound() + offset);
    }

    // Priming pass: scroll through the whole range once without capturing,
    // to trigger scroll-into-view lazy-load observers early, then return to
    // the top and give those loads time to actually finish before the real
    // capture pass begins. Most lazy-load implementations trigger on
    // IntersectionObserver, which only fires once an element has actually
    // been scrolled into view — a single top-to-bottom capture pass alone
    // is too late, since each slice is captured right as it first scrolls in.
    for (let offset = 0; offset < scaledHeight; offset += window.innerHeight) {
      scrollToContentOffset(offset);
      await waitForNextPaint();
      await new Promise((resolve) => setTimeout(resolve, PRIME_STEP_DELAY_MS));
    }
    scrollToContentOffset(0);
    await waitToSettle();

    const canvas = document.createElement("canvas");
    let ctx = null;
    let composedHeight = 0; // captured-image pixel units
    let contentOffset = 0; // CSS px, relative to the card's own top

    // Bounded so a bad measurement can't spin this into a near-infinite loop.
    for (let guard = 0; guard < 60; guard++) {
      scrollToContentOffset(contentOffset);
      await waitForNextPaint();

      const rect = viewport.getBoundingClientRect();
      const visibleTop = topBound();
      const visibleBottom = Math.min(rect.bottom, window.innerHeight);
      const availableCssHeight = visibleBottom - visibleTop;
      if (availableCssHeight <= 0) break;

      const image = await captureVisibleTabImage(viewport);
      const pixelScale = image.width / document.documentElement.clientWidth;

      if (!ctx) {
        canvas.width = Math.round(rect.width * pixelScale);
        canvas.height = Math.round(scaledHeight * pixelScale);
        ctx = canvas.getContext("2d");
      }

      // Anchored to the bottom of what's visible, taking exactly the
      // remaining pixels needed rather than a full slice from the top: on a
      // normal iteration `remaining` exceeds a full slice, so this reduces
      // to the same top-anchored crop as before, but on the final iteration
      // it stays correct even if window.scrollTo above got clamped short of
      // the requested position (e.g. the page can't scroll any further) —
      // sourcing from the reliably-measured bottom edge avoids capturing an
      // overlapping band of already-seen content that a top-anchored crop
      // would if the actual scroll position ended up short of what the
      // untouched `contentOffset` bookkeeping assumed.
      const remaining = canvas.height - composedHeight;
      const drawHeight = Math.min(Math.round(availableCssHeight * pixelScale), remaining);
      const sourceTop = visibleBottom - drawHeight / pixelScale;

      ctx.drawImage(
        image,
        rect.left * pixelScale,
        sourceTop * pixelScale,
        canvas.width,
        drawHeight,
        0,
        composedHeight,
        canvas.width,
        drawHeight
      );

      composedHeight += drawHeight;
      contentOffset += visibleBottom - sourceTop;
      if (composedHeight >= canvas.height) break;

      await waitToSettle();
    }

    return canvas;
  } finally {
    iframe.style.height = originalIframeHeight;
    viewport.style.height = originalViewportHeight;
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function waitToSettle() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, SETTLE_DELAY_MS)));
  });
}

// chrome.tabs.captureVisibleTab grabs whatever's actually painted on
// screen — including Sense's own "Capturing…" overlay sitting on top of the
// card, which would otherwise get baked directly into the output. Hiding it
// for just this instant (with a frame to let the removal actually paint
// before the snapshot) keeps it visible to the user between shots without
// ever showing up in a downloaded image.
async function captureVisibleTabImage(viewportToHide) {
  viewportToHide?.classList.remove("is-capturing");
  if (viewportToHide) await new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    const response = await chrome.runtime.sendMessage({ type: "sense-capture-tab" });
    if (!response?.dataUrl) {
      throw new Error(response?.error || "No screenshot data was returned.");
    }
    return await loadImage(response.dataUrl);
  } finally {
    viewportToHide?.classList.add("is-capturing");
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the captured screenshot."));
    img.src = src;
  });
}

// The capture is at native pixel resolution (accounting for device pixel
// ratio / page zoom); deriving the scale from the image's own dimensions
// rather than assuming window.devicePixelRatio keeps this correct either way.
function cropToRect(image, rect) {
  const scale = image.width / document.documentElement.clientWidth;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    rect.left * scale,
    rect.top * scale,
    rect.width * scale,
    rect.height * scale,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas;
}

function combineHorizontally(canvases) {
  const totalWidth = canvases.reduce((sum, c) => sum + c.width, 0) + COMBINED_GAP * Math.max(0, canvases.length - 1);
  const maxHeight = Math.max(0, ...canvases.map((c) => c.height));

  const combined = document.createElement("canvas");
  combined.width = totalWidth;
  combined.height = maxHeight;

  const ctx = combined.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalWidth, maxHeight);

  let x = 0;
  for (const canvas of canvases) {
    ctx.drawImage(canvas, x, 0);
    x += canvas.width + COMBINED_GAP;
  }

  return combined;
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

function screenshotFilename(entry) {
  const safeName = entry.currentDevice.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `sense-${entry.category.id}-${safeName}.png`;
}
