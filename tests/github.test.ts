import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { matchBounty, verifyGithubSignature } from "../lib/github";
import type { Bounty } from "../lib/types";

function bounty(id: string, repo: string, issueNumber: number, status: Bounty["status"]): Bounty {
  return {
    id,
    title: "T",
    summary: "",
    repo,
    issueNumber,
    amountCents: 1000,
    currency: "USD",
    criteria: ["c"],
    contributorEmail: "a@b.co",
    contributorName: "A",
    status,
    escrow: { mode: "mock", orderId: "o" },
    createdAt: `2026-01-0${id.length}T00:00:00.000Z`,
    updatedAt: "2026-01-01T00:00:00.000Z",
    events: [],
  };
}

describe("verifyGithubSignature", () => {
  const secret = "s3cret";
  const body = '{"hello":"world"}';
  const good = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts a valid signature", () => {
    expect(verifyGithubSignature(secret, body, good)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyGithubSignature(secret, `${body} `, good)).toBe(false);
  });

  it("rejects missing secrets and headers", () => {
    expect(verifyGithubSignature("", body, good)).toBe(false);
    expect(verifyGithubSignature(secret, body, null)).toBe(false);
  });
});

describe("matchBounty", () => {
  const bounties = [
    bounty("bty_a", "acme/httpkit", 142, "ESCROWED"),
    bounty("bty_b", "acme/other", 7, "ESCROWED"),
    bounty("bty_c", "acme/httpkit", 99, "PAID"),
  ];

  it("matches on the referenced issue number", () => {
    expect(matchBounty(bounties, "acme/httpkit", "Fixes #142", [])?.id).toBe("bty_a");
  });

  it("matches on a bounty label", () => {
    expect(matchBounty(bounties, "acme/httpkit", "no reference", ["bounty:bty_a"])?.id).toBe("bty_a");
  });

  it("falls back to the newest escrowed bounty for the repo", () => {
    expect(matchBounty(bounties, "acme/other", null, [])?.id).toBe("bty_b");
  });

  it("ignores paid bounties", () => {
    expect(matchBounty(bounties, "acme/httpkit", "Fixes #99", [])?.id).toBe("bty_a");
  });

  it("returns null for an unknown repo", () => {
    expect(matchBounty(bounties, "nobody/nothing", "Fixes #1", [])).toBeNull();
  });
});
