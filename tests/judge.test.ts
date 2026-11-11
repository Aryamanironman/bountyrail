import { describe, expect, it } from "vitest";
import { heuristicReview } from "../lib/judge";
import type { Bounty } from "../lib/types";

function bounty(): Bounty {
  return {
    id: "bty_test",
    title: "Retry with backoff",
    summary: "",
    repo: "acme/httpkit",
    issueNumber: 1,
    amountCents: 10000,
    currency: "USD",
    criteria: [
      "Retries failed requests three times with exponential backoff",
      "Adds unit tests covering timeout and 5xx paths",
    ],
    contributorEmail: "dev@example.com",
    contributorName: "Dev",
    status: "ESCROWED",
    escrow: { mode: "mock", orderId: "MOCK-ORD", authorizationId: "MOCK-AUTH" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [],
  };
}

const GOOD_DIFF = `retries failed requests three times with exponential backoff
unit tests covering timeout and 5xx code paths
+ def retry(): ...`;

describe("heuristicReview", () => {
  it("passes a patch that covers every criterion and has passing tests", () => {
    const result = heuristicReview(bounty(), {
      diff: GOOD_DIFF,
      testOutput: "30 passed, 0 failed",
      files: ["client.py"],
    });
    expect(result.verdict).toBe("pass");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.checks).toHaveLength(2);
    expect(result.aiUsed).toBe(false);
  });

  it("does not pass when tests fail", () => {
    const result = heuristicReview(bounty(), {
      diff: GOOD_DIFF,
      testOutput: "28 passed, 2 failed",
    });
    expect(result.verdict).not.toBe("pass");
  });

  it("fails an empty patch", () => {
    const result = heuristicReview(bounty(), { diff: "", testOutput: "ok" });
    expect(result.verdict).toBe("fail");
  });

  it("flags missing evidence per criterion", () => {
    const result = heuristicReview(bounty(), {
      diff: "unrelated change to the README",
      testOutput: "1 passed, 0 failed",
    });
    expect(result.checks.every((c) => !c.met)).toBe(true);
    expect(result.verdict).toBe("needs_review");
  });
});
