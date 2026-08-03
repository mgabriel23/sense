// Strips headers that block iframe embedding (X-Frame-Options, CSP frame-ancestors).
// Scoped by tabId (one rule per Sense viewer tab) rather than by initiator origin —
// this also covers nested third-party iframes the previewed page embeds itself (an
// ad, a video embed, a widget), whose initiator is the previewed site rather than
// Sense, while still never touching any tab other than this specific viewer tab —
// the same "only affects Sense's own preview" guarantee, just enforced per-tab
// instead of per-initiator. Session-scoped (not dynamic): these are created fresh
// whenever a viewer tab opens and don't need to survive a full browser restart, but
// do survive service worker restarts, which happen often in MV3 and would otherwise
// leave already-open tabs with a gap in coverage.
export async function addHeaderStripRuleForTab(tabId) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
    addRules: [
      {
        id: tabId,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "x-frame-options", operation: "remove" },
            { header: "content-security-policy", operation: "remove" },
            { header: "content-security-policy-report-only", operation: "remove" },
          ],
        },
        condition: {
          resourceTypes: ["sub_frame"],
          tabIds: [tabId],
        },
      },
    ],
  });
}

export async function removeHeaderStripRuleForTab(tabId) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
  });
}
