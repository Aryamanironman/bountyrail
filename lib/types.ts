export type BountyStatus =
  | "AWAITING_APPROVAL"
  | "ESCROWED"
  | "NEEDS_WORK"
  | "VERIFIED"
  | "PAID"
  | "PAYOUT_FAILED";

export type JudgeVerdict = "pass" | "fail" | "needs_review";

export type EscrowMode = "mock" | "live";

export interface Escrow {
  mode: EscrowMode;
  orderId: string;
  approveUrl?: string;
  authorizationId?: string;
  captureId?: string;
  authorizedAt?: string;
  capturedAt?: string;
}

export interface JudgeCheck {
  criterion: string;
  met: boolean;
  evidence: string;
}

export interface Submission {
  id: string;
  source: "manual" | "github";
  prUrl?: string;
  contributor?: string;
  diff: string;
  testOutput: string;
  files: string[];
  verdict: JudgeVerdict;
  score: number;
  checks: JudgeCheck[];
  summary: string;
  model: string;
  aiUsed: boolean;
  reviewedAt: string;
}

export interface Payout {
  batchId: string;
  itemId: string;
  receiver: string;
  status: string;
  amountCents: number;
  paidAt?: string;
  error?: string;
}

export type EventType =
  | "created"
  | "escrow_created"
  | "escrow_authorized"
  | "submitted"
  | "verified"
  | "needs_work"
  | "released"
  | "paid"
  | "failed";

export interface BountyEvent {
  id: string;
  at: string;
  type: EventType;
  message: string;
}

export interface Bounty {
  id: string;
  title: string;
  summary: string;
  repo: string;
  issueNumber: number;
  issueUrl?: string;
  amountCents: number;
  currency: "USD";
  criteria: string[];
  contributorEmail: string;
  contributorName: string;
  status: BountyStatus;
  escrow: Escrow;
  submission?: Submission;
  payout?: Payout;
  createdAt: string;
  updatedAt: string;
  events: BountyEvent[];
}

export interface CreateBountyInput {
  title: string;
  summary?: string;
  repo: string;
  issueNumber: number;
  amountCents: number;
  criteria: string[];
  contributorEmail: string;
  contributorName?: string;
}

export interface SubmissionInput {
  diff: string;
  testOutput?: string;
  files?: string[];
  source?: "manual" | "github";
  prUrl?: string;
  contributor?: string;
}

export const STATUS_LABEL: Record<BountyStatus, string> = {
  AWAITING_APPROVAL: "Awaiting escrow",
  ESCROWED: "Escrow locked",
  NEEDS_WORK: "Needs work",
  VERIFIED: "AI verified",
  PAID: "Paid",
  PAYOUT_FAILED: "Payout failed",
};
