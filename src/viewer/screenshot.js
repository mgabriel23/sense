// Crops a full-tab screenshot down to just one device card's rendered
// preview and downloads it as a PNG.
//
// chrome.tabs.captureVisibleTab only captures whatever's currently visible
// on screen, so the card is scrolled into view first — this makes per-card
// capture reliable regardless of where it sits in a possibly-scrolled grid
// (though a preview taller than the whole browser window still can't be
// captured in one shot, since there's nothing beyond "what's on screen" to
// grab).
export async function captureCard(entry) {
  entry.viewport.scrollIntoView({ block: "center", inline: "center" });
  await waitForNextPaint();

  const response = await chrome.runtime.sendMessage({ type: "sense-capture-tab" });
  if (!response?.dataUrl) {
    throw new Error(response?.error || "No screenshot data was returned.");
  }

  const image = await loadImage(response.dataUrl);
  const cropped = cropToElement(image, entry.viewport);
  downloadCanvas(cropped, screenshotFilename(entry));
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
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
function cropToElement(image, element) {
  const rect = element.getBoundingClientRect();
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
