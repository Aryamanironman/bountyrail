import type { Bounty, BountyEvent } from "./types";

function ev(type: BountyEvent["type"], at: string, message: string): BountyEvent {
  return { id: `${type}-${at}`, at, type, message };
}

const NOW = Date.now();
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

export const DEMO_SUBMISSION = {
  source: "manual" as const,
  prUrl: "https://github.com/acme/httpkit/pull/147",
  contributor: "maya-dev",
  files: ["httpkit/client.py", "tests/test_client.py"],
  diff: `# Retries failed requests three times with exponential backoff.
# Preserves the existing config defaults.
# unit tests covering timeout and 5xx code paths.

--- a/httpkit/client.py
+++ b/httpkit/client.py
@@ -12,6 +12,7 @@ class Client:
     def __init__(self, base_url: str, config: dict | None = None):
         self.base_url = base_url
         self.config = {**DEFAULT_CONFIG, **(config or {})}
+        self.max_attempts = self.config.get("max_attempts", 3)

-    def request(self, method: str, path: str, **kwargs):
-        return self._send(method, path, **kwargs)
+    def request(self, method: str, path: str, **kwargs):
+        last_error = None
+        for attempt in range(self.max_attempts):
+            try:
+                return self._send(method, path, **kwargs)
+            except (TimeoutError, HTTPError) as exc:
+                if getattr(exc, "status", 0) and exc.status < 500:
+                    raise
+                last_error = exc
+                time.sleep(0.25 * (2 ** attempt))
+        raise last_error

--- a/tests/test_client.py
+++ b/tests/test_client.py
@@ -88,6 +88,24 @@ def test_parses_error_body():
     assert exc.value.code == "bad_request"

+def test_retries_timeout_then_succeeds():
+    # A timeout is retried three times before the request succeeds.
+    client = Client("https://api.test", {"max_attempts": 3})
+    with patch.object(client, "_send", side_effect=[TimeoutError(), TimeoutError(), "ok"]):
+        assert client.request("GET", "/health") == "ok"
+
+def test_does_not_retry_4xx():
+    client = Client("https://api.test")
+    with patch.object(client, "_send", side_effect=HTTPError(404)) as send:
+        with pytest.raises(HTTPError):
+            client.request("GET", "/missing")
+    assert send.call_count == 1
+
+def test_retries_5xx_with_exponential_backoff(monkeypatch):
+    sleeps = []
+    monkeypatch.setattr(time, "sleep", sleeps.append)
+    # 5xx code paths back off 0.25s, then 0.5s.
+    assert sleeps == [0.25, 0.5]
`,
  testOutput: `$ pytest -q
..............................
30 passed, 0 failed in 0.61s`,
};

export function demoBounties(): Bounty[] {
  return [
    {
      id: "bty_demo_retry",
      title: "Add retry with exponential backoff to the HTTP client",
      summary:
        "Transient timeouts and 5xx responses currently fail the first request. Retry them without changing the default configuration surface.",
      repo: "acme/httpkit",
      issueNumber: 142,
      issueUrl: "https://github.com/acme/httpkit/issues/142",
      amountCents: 15000,
      currency: "USD",
      criteria: [
        "Retries failed requests three times with exponential backoff",
        "Adds unit tests covering timeout and 5xx paths",
        "Preserves the existing config defaults",
      ],
      contributorEmail: "maya@example.com",
      contributorName: "Maya Okafor",
      status: "ESCROWED",
      escrow: {
        mode: "mock",
        orderId: "MOCK-ORD-4H8N2K",
        authorizationId: "MOCK-AUTH-7QK2P9",
        authorizedAt: ago(212),
      },
      createdAt: ago(240),
      updatedAt: ago(212),
      events: [
        ev("created", ago(240), "Bounty created for acme/httpkit#142"),
        ev("escrow_created", ago(239), "Escrow order MOCK-ORD-4H8N2K created (demo mode)"),
        ev("escrow_authorized", ago(212), "Escrow authorized (MOCK-AUTH-7QK2P9); funds held, not captured"),
      ],
    },
    {
      id: "bty_demo_csv",
      title: "Fix CSV export dropping the final row",
      summary:
        "The exporter buffers rows and never flushes the last chunk when the file has no trailing newline.",
      repo: "acme/datakit",
      issueNumber: 88,
      issueUrl: "https://github.com/acme/datakit/issues/88",
      amountCents: 24000,
      currency: "USD",
      criteria: [
        "Last row is always written even without a trailing newline",
        "Adds a regression test with a two-row fixture",
        "Keeps streaming memory use unchanged",
      ],
      contributorEmail: "jonas@example.com",
      contributorName: "Jonas Weber",
      status: "ESCROWED",
      escrow: {
        mode: "mock",
        orderId: "MOCK-ORD-9PL3XZ",
        authorizationId: "MOCK-AUTH-3MN8VC",
        authorizedAt: ago(95),
      },
      createdAt: ago(120),
      updatedAt: ago(95),
      events: [
        ev("created", ago(120), "Bounty created for acme/datakit#88"),
        ev("escrow_created", ago(119), "Escrow order MOCK-ORD-9PL3XZ created (demo mode)"),
        ev("escrow_authorized", ago(95), "Escrow authorized (MOCK-AUTH-3MN8VC); funds held, not captured"),
      ],
    },
    {
      id: "bty_demo_dark",
      title: "Add dark mode to the settings panel",
      summary:
        "Ship a dark theme for the settings panel that follows the system preference and persists an override.",
      repo: "acme/uikit",
      issueNumber: 51,
      issueUrl: "https://github.com/acme/uikit/issues/51",
      amountCents: 32000,
      currency: "USD",
      criteria: [
        "Follows prefers-color-scheme by default",
        "Persists an explicit user override",
        "Meets WCAG AA contrast in both themes",
      ],
      contributorEmail: "lena@example.com",
      contributorName: "Lena Park",
      status: "PAID",
      escrow: {
        mode: "mock",
        orderId: "MOCK-ORD-2QW7RT",
        authorizationId: "MOCK-AUTH-8HJ4KD",
        authorizedAt: ago(2900),
        captureId: "MOCK-CAP-5TR9LM",
        capturedAt: ago(620),
      },
      submission: {
        id: "sub_demo_dark",
        source: "manual",
        prUrl: "https://github.com/acme/uikit/pull/63",
        contributor: "lena-park",
        diff: "# Follows prefers-color-scheme by default\n# Persists an explicit user override\n# Meets WCAG AA contrast in both themes\n+ :root[data-theme=\"dark\"] { ... }",
        testOutput: "24 passed, 0 failed",
        files: ["src/settings/theme.ts", "src/settings/theme.test.ts"],
        verdict: "pass",
        score: 94,
        checks: [
          { criterion: "Follows prefers-color-scheme by default", met: true, evidence: "Match media query added in theme.ts" },
          { criterion: "Persists an explicit user override", met: true, evidence: "localStorage write covered by test" },
          { criterion: "Meets WCAG AA contrast in both themes", met: true, evidence: "Contrast tokens verified in test output" },
        ],
        summary:
          "Patch matches all three criteria, tests pass, and the override path is covered by a new unit test.",
        model: "bountyrail-heuristic-v1",
        aiUsed: false,
        reviewedAt: ago(650),
      },
      payout: {
        batchId: "MOCK-BATCH-2F8QPL",
        itemId: "MOCK-ITEM-6K1DZC",
        receiver: "lena@example.com",
        status: "SUCCESS",
        amountCents: 32000,
        paidAt: ago(619),
      },
      createdAt: ago(3000),
      updatedAt: ago(619),
      events: [
        ev("created", ago(3000), "Bounty created for acme/uikit#51"),
        ev("escrow_created", ago(2999), "Escrow order MOCK-ORD-2QW7RT created (demo mode)"),
        ev("escrow_authorized", ago(2900), "Escrow authorized (MOCK-AUTH-8HJ4KD); funds held, not captured"),
        ev("submitted", ago(660), "Pull request submitted: https://github.com/acme/uikit/pull/63"),
        ev("verified", ago(650), "AI review: pass (94/100)"),
        ev("released", ago(625), "PayPal authorization captured (MOCK-CAP-5TR9LM); maintainer confirmed"),
        ev("paid", ago(619), "Payout MOCK-BATCH-2F8QPL sent to lena@example.com (SUCCESS)"),
      ],
    },
    {
      id: "bty_demo_docs",
      title: "Document the token-bucket rate limiter",
      summary:
        "Add a README section and docstrings for the limiter, including the burst and refill semantics.",
      repo: "acme/ratelimit",
      issueNumber: 17,
      issueUrl: "https://github.com/acme/ratelimit/issues/17",
      amountCents: 7500,
      currency: "USD",
      criteria: [
        "README explains burst capacity and refill rate",
        "Every public function has a docstring",
      ],
      contributorEmail: "sam@example.com",
      contributorName: "Sam Rivera",
      status: "AWAITING_APPROVAL",
      escrow: {
        mode: "mock",
        orderId: "MOCK-ORD-6B1YWF",
        approveUrl: "/bounties/bty_demo_docs",
      },
      createdAt: ago(18),
      updatedAt: ago(18),
      events: [
        ev("created", ago(18), "Bounty created for acme/ratelimit#17"),
        ev("escrow_created", ago(18), "Escrow order MOCK-ORD-6B1YWF created (demo mode)"),
      ],
    },
  ];
}
