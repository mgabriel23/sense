// Short notification tones, synthesized via the Web Audio API rather than
// bundled audio files — nothing to fetch, no binary asset to ship, same
// reasoning as tools/generate-icons.js drawing the toolbar icon from code.
let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
  }
  // Browsers start an AudioContext suspended until a user gesture unlocks
  // it; resuming an already-running context is a harmless no-op, so it's
  // simplest to just attempt this every time rather than tracking unlock
  // state separately.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// A toast-triggering click is often followed by an await (a screenshot
// capture, a storage write) before the toast — and the sound — actually
// fires, by which point the click that "unlocked" audio may be a few
// hundred ms in the past. Attempting the unlock on the page's very first
// interaction instead means the context is already running well before any
// real toast shows up, so that later call just works.
function unlockOnFirstInteraction() {
  const unlock = () => {
    getContext();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}
unlockOnFirstInteraction();

function tone(context, destination, { frequency, startTime, duration, gain, type }) {
  const osc = context.createOscillator();
  const gainNode = context.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  // Linear attack then exponential decay — a hard on/off would click/pop;
  // this reads as a soft, short chime instead.
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// Each pattern is a short sequence of notes (offset = seconds after the
// pattern starts). Pitched to read as "up" (success), "flat/alert"
// (warning), or "down" (error) without needing to be loud to land.
const PATTERNS = {
  success: [
    { offset: 0, frequency: 880, duration: 0.11, gain: 0.13, type: "sine" },
    { offset: 0.09, frequency: 1174.66, duration: 0.18, gain: 0.13, type: "sine" },
  ],
  warning: [
    { offset: 0, frequency: 659.25, duration: 0.1, gain: 0.12, type: "triangle" },
    { offset: 0.14, frequency: 659.25, duration: 0.14, gain: 0.12, type: "triangle" },
  ],
  error: [
    { offset: 0, frequency: 415.3, duration: 0.13, gain: 0.13, type: "triangle" },
    { offset: 0.11, frequency: 311.13, duration: 0.2, gain: 0.13, type: "triangle" },
  ],
  // A single soft, quiet tick rather than a chime — View/Reload are common
  // clicks, so this fires far more often than success/warning/error, and
  // needs to stay unobtrusive rather than announce itself.
  loading: [{ offset: 0, frequency: 587.33, duration: 0.07, gain: 0.07, type: "sine" }],
};

// success/warning/error/loading all play a sound — the "default" toast
// variant (options page's Undo confirmations) is the one exception, since
// it fires often during routine list editing and a sound on every single
// one would get old fast.
export function playToastSound(variant) {
  const pattern = PATTERNS[variant];
  if (!pattern) return;

  try {
    const context = getContext();
    if (!context) return;
    const now = context.currentTime;
    for (const step of pattern) {
      tone(context, context.destination, { ...step, startTime: now + step.offset });
    }
  } catch {
    // Sound is a non-essential enhancement — never let it stop a toast
    // from showing just because audio isn't available in this context.
  }
}
