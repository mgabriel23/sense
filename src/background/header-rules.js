const HEADER_STRIP_RULE_ID = 1;

// Strips headers that block iframe embedding (X-Frame-Options, CSP frame-ancestors),
// scoped by initiatorDomains to sub-frames created by Sense's own viewer page only —
// this must never widen to match iframes on other sites the user visits normally.
export async function ensureHeaderStripRule() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [HEADER_STRIP_RULE_ID],
    addRules: [
      {
        id: HEADER_STRIP_RULE_ID,
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
          initiatorDomains: [chrome.runtime.id],
        },
      },
    ],
  });
}
