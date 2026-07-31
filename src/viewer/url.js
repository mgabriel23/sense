// Returns a normalized http(s) URL string, or null if the input can't be
// interpreted as one. Rejects other schemes (e.g. javascript:) so callers can
// safely pass the result straight into an iframe's src.
export function normalizeUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.toString();
}
