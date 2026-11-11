import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { authorizeBounty, createBounty, releaseBounty, reviewBounty } from "../lib/pipeline";

const INPUT = {
  title: "Add retry with backoff",
  repo: "acme/httpkit",
  issueNumber: 142,
  amountCents: 15000,
  criteria: [
    "Retries failed requests three times with exponential backoff",
    "Adds unit tests covering timeout and 5xx paths",
  ],
  contributorEmail: "maya@example.com",
  contributorName: "Maya",
};

const SUBMISSION = {
  diff: "retries failed requests three times with exponential backoff\nunit tests covering timeout and 5xx code paths\n+ code",
  testOutput: "12 passed, 0 failed",
  files: ["client.py"],
};

beforeAll(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bountyrail-test-"));
  process.env.DATA_DIR = dir;
  delete process.env.PAYPAL_CLIENT_ID;
  delete process.env.PAYPAL_CLIENT_SECRET;
  delete process.env.AI_API_KEY;
});

describe("bounty pipeline", () => {
  it("runs create → authorize → review → release", async () => {
    const created = await createBounty(INPUT);
    expect(created.status).toBe("AWAITING_APPROVAL");
    expect(created.escrow.mode).toBe("mock");

    const authorized = await authorizeBounty(created.id);
    expect(authorized.status).toBe("ESCROWED");
    expect(authorized.escrow.authorizationId).toBeTruthy();

    const { bounty: reviewed } = await reviewBounty(created.id, SUBMISSION);
    expect(reviewed.status).toBe("VERIFIED");
    expect(reviewed.submission?.verdict).toBe("pass");

    const released = await releaseBounty(created.id);
    expect(released.ok).toBe(true);
    expect(released.bounty.status).toBe("PAID");
    expect(released.bounty.escrow.captureId).toBeTruthy();
    expect(released.bounty.payout?.status).toBe("SUCCESS");
  });

  it("refuses to release work that has not been verified", async () => {
    const created = await createBounty({ ...INPUT, issueNumber: 143 });
    await authorizeBounty(created.id);
    await expect(releaseBounty(created.id)).rejects.toMatchObject({ code: "NOT_VERIFIED" });
  });

  it("refuses to review before the escrow is funded", async () => {
    const created = await createBounty({ ...INPUT, issueNumber: 144 });
    await expect(reviewBounty(created.id, SUBMISSION)).rejects.toMatchObject({ code: "NOT_ESCROWED" });
  });

  it("refuses a second payout", async () => {
    const created = await createBounty({ ...INPUT, issueNumber: 145 });
    await authorizeBounty(created.id);
    await reviewBounty(created.id, SUBMISSION);
    const first = await releaseBounty(created.id);
    expect(first.ok).toBe(true);
    await expect(releaseBounty(created.id)).rejects.toMatchObject({ code: "ALREADY_PAID" });
  });
});
