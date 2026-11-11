import { randomUUID } from "node:crypto";
import { getBounty, insertBounty, updateBounty } from "./db";
import { judgeSubmission } from "./judge";
import {
  authorizeEscrow,
  captureAuthorization,
  createEscrowOrder,
  NeedsApprovalError,
  sendPayout,
} from "./paypal";
import type { Bounty, BountyEvent, CreateBountyInput, SubmissionInput } from "./types";

export class PipelineError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "INVALID_STATE") {
    super(message);
    this.name = "PipelineError";
    this.status = status;
    this.code = code;
  }
}

function event(type: BountyEvent["type"], message: string): BountyEvent {
  return { id: randomUUID(), at: new Date().toISOString(), type, message };
}

function newBountyId(): string {
  return `bty_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function createBounty(input: CreateBountyInput): Promise<Bounty> {
  const id = newBountyId();
  const now = new Date().toISOString();

  const escrow = await createEscrowOrder({
    bountyId: id,
    title: input.title,
    amountCents: input.amountCents,
  });

  const bounty: Bounty = {
    id,
    title: input.title,
    summary: input.summary || "",
    repo: input.repo,
    issueNumber: input.issueNumber,
    issueUrl: `https://github.com/${input.repo}/issues/${input.issueNumber}`,
    amountCents: input.amountCents,
    currency: "USD",
    criteria: input.criteria,
    contributorEmail: input.contributorEmail,
    contributorName: input.contributorName || input.contributorEmail.split("@")[0],
    status: "AWAITING_APPROVAL",
    escrow,
    createdAt: now,
    updatedAt: now,
    events: [
      event("created", `Bounty created for ${input.repo}#${input.issueNumber}`),
      event(
        "escrow_created",
        escrow.mode === "live"
          ? `PayPal authorization order ${escrow.orderId} created`
          : `Demo escrow order ${escrow.orderId} created (mock mode)`,
      ),
    ],
  };

  return insertBounty(bounty);
}

export async function authorizeBounty(id: string): Promise<Bounty> {
  const bounty = await getBounty(id);
  if (!bounty) throw new PipelineError("Bounty not found", 404, "NOT_FOUND");
  if (bounty.status === "ESCROWED" || bounty.escrow.authorizationId) return bounty;
  if (bounty.status !== "AWAITING_APPROVAL") {
    throw new PipelineError(`Cannot authorize escrow from ${bounty.status}`, 409);
  }
  if (!bounty.escrow.orderId) {
    throw new PipelineError("This bounty has no PayPal order", 409, "NO_ORDER");
  }

  const result = await authorizeEscrow(bounty.escrow.orderId);
  const updated = await updateBounty(id, (b) => {
    b.escrow.authorizationId = result.authorizationId;
    b.escrow.authorizedAt = new Date().toISOString();
    if (result.approveUrl) b.escrow.approveUrl = result.approveUrl;
    b.status = "ESCROWED";
    b.events.push(
      event("escrow_authorized", `Escrow authorized (${result.authorizationId}); funds held, not captured`),
    );
  });
  return updated!;
}

function assertReviewable(bounty: Bounty): void {
  if (bounty.status === "PAID") {
    throw new PipelineError("This bounty is already paid", 409, "ALREADY_PAID");
  }
  if (bounty.status === "AWAITING_APPROVAL") {
    throw new PipelineError("Fund the escrow before submitting work", 409, "NOT_ESCROWED");
  }
  if (bounty.status === "PAYOUT_FAILED") {
    throw new PipelineError("This bounty is captured and awaiting payout retry", 409, "PAYOUT_FAILED");
  }
}

export async function reviewBounty(
  id: string,
  input: SubmissionInput,
): Promise<{ bounty: Bounty; needsApproval?: string }> {
  const bounty = await getBounty(id);
  if (!bounty) throw new PipelineError("Bounty not found", 404, "NOT_FOUND");
  assertReviewable(bounty);

  const review = await judgeSubmission(bounty, input);
  const submission = {
    id: randomUUID(),
    source: input.source || ("manual" as const),
    prUrl: input.prUrl,
    contributor: input.contributor,
    diff: (input.diff || "").slice(0, 20_000),
    testOutput: (input.testOutput || "").slice(0, 10_000),
    files: (input.files || []).slice(0, 50),
    verdict: review.verdict,
    score: review.score,
    checks: review.checks,
    summary: review.summary,
    model: review.model,
    aiUsed: review.aiUsed,
    reviewedAt: new Date().toISOString(),
  };

  const updated = await updateBounty(id, (b) => {
    b.submission = submission;
    b.status = review.verdict === "pass" ? "VERIFIED" : "NEEDS_WORK";
    b.events.push(
      event(
        "submitted",
        input.prUrl ? `Pull request submitted: ${input.prUrl}` : "Manual submission received",
      ),
    );
    b.events.push(
      event(
        review.verdict === "pass" ? "verified" : "needs_work",
        `${review.aiUsed ? "AI" : "Deterministic"} review: ${review.verdict} (${review.score}/100)`,
      ),
    );
  });
  return { bounty: updated! };
}

const releasing = new Set<string>();

export async function releaseBounty(
  id: string,
): Promise<{ bounty: Bounty; message: string; ok: boolean }> {
  if (releasing.has(id)) {
    throw new PipelineError("A release is already in progress", 409, "IN_FLIGHT");
  }
  releasing.add(id);
  try {
    const bounty = await getBounty(id);
    if (!bounty) throw new PipelineError("Bounty not found", 404, "NOT_FOUND");
    if (bounty.status === "PAID") {
      throw new PipelineError("This bounty is already paid", 409, "ALREADY_PAID");
    }
    if (bounty.status !== "VERIFIED" && bounty.status !== "PAYOUT_FAILED") {
      throw new PipelineError("Only an AI-verified bounty can be released", 409, "NOT_VERIFIED");
    }
    if (!bounty.escrow.authorizationId) {
      throw new PipelineError("No PayPal authorization to capture", 409, "NO_AUTHORIZATION");
    }

    let captureId = bounty.escrow.captureId;
    if (!captureId) {
      const captured = await captureAuthorization(bounty.escrow.authorizationId);
      captureId = captured.captureId;
      await updateBounty(id, (b) => {
        b.escrow.captureId = captureId;
        b.escrow.capturedAt = new Date().toISOString();
        b.events.push(
          event("released", `PayPal authorization captured (${captureId}); maintainer confirmed`),
        );
      });
    }

    const attempt = bounty.payout?.batchId ? 1 : 0;
    try {
      const payout = await sendPayout({
        bountyId: id,
        receiver: bounty.contributorEmail,
        amountCents: bounty.amountCents,
        note: `Bounty: ${bounty.title}`,
        attempt,
      });
      const paid = await updateBounty(id, (b) => {
        b.payout = {
          batchId: payout.batchId,
          itemId: payout.itemId,
          receiver: b.contributorEmail,
          status: payout.status,
          amountCents: b.amountCents,
          paidAt: new Date().toISOString(),
        };
        b.status = "PAID";
        b.events.push(
          event("paid", `Payout ${payout.batchId} sent to ${b.contributorEmail} (${payout.status})`),
        );
      });
      return {
        bounty: paid!,
        ok: true,
        message: `Captured ${captureId} and paid ${bounty.contributorEmail}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payout failed";
      const failed = await updateBounty(id, (b) => {
        b.status = "PAYOUT_FAILED";
        b.payout = {
          batchId: "",
          itemId: "",
          receiver: b.contributorEmail,
          status: "FAILED",
          amountCents: b.amountCents,
          error: message,
        };
        b.events.push(event("failed", `PayPal payout failed: ${message}`));
      });
      return { bounty: failed!, ok: false, message: `Funds captured but payout failed: ${message}` };
    }
  } finally {
    releasing.delete(id);
  }
}

export { NeedsApprovalError };
