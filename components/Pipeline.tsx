import { formatMoney, shortId, timeAgo } from "@/lib/format";
import type { Bounty, EventType } from "@/lib/types";

interface Step {
  key: string;
  title: string;
  desc: string;
  at?: string;
  state: "done" | "active" | "pending" | "error";
}

function lastEventAt(bounty: Bounty, type: EventType): string | undefined {
  const match = [...bounty.events].reverse().find((e) => e.type === type);
  return match?.at;
}

export function Pipeline({ bounty }: { bounty: Bounty }) {
  const escrowed = bounty.status !== "AWAITING_APPROVAL";
  const hasSubmission = Boolean(bounty.submission);
  const verified =
    bounty.status === "VERIFIED" || bounty.status === "PAID" || bounty.status === "PAYOUT_FAILED";
  const needsWork = bounty.status === "NEEDS_WORK";
  const paid = bounty.status === "PAID";
  const payoutFailed = bounty.status === "PAYOUT_FAILED";

  const steps: Step[] = [
    {
      key: "posted",
      title: "Bounty posted",
      desc: `${bounty.repo}#${bounty.issueNumber} · ${bounty.criteria.length} acceptance criteria`,
      at: bounty.createdAt,
      state: "done",
    },
    {
      key: "escrow",
      title: "Escrow locked",
      desc: escrowed
        ? `PayPal authorization ${shortId(bounty.escrow.authorizationId || "", 14)} · funds held, not captured`
        : "Waiting for the sponsor to approve the authorization",
      at: bounty.escrow.authorizedAt,
      state: escrowed ? "done" : "active",
    },
    {
      key: "patch",
      title: "Patch submitted",
      desc: hasSubmission
        ? bounty.submission?.prUrl
          ? `Pull request ${bounty.submission.prUrl}`
          : "Manual evidence attached by the maintainer"
        : "Waiting for a pull request or manual evidence",
      at: lastEventAt(bounty, "submitted"),
      state: hasSubmission ? "done" : escrowed ? "active" : "pending",
    },
    {
      key: "verified",
      title: "AI verified",
      desc: hasSubmission
        ? `${bounty.submission?.verdict.toUpperCase()} · ${bounty.submission?.score}/100 · ${
            bounty.submission?.aiUsed ? bounty.submission?.model : "deterministic fallback"
          }`
        : "No review yet",
      at: lastEventAt(bounty, "verified") || lastEventAt(bounty, "needs_work"),
      state: verified ? "done" : needsWork ? "error" : "pending",
    },
    {
      key: "paid",
      title: "Funds released",
      desc: paid
        ? `${formatMoney(bounty.amountCents)} paid to ${bounty.contributorEmail}`
        : payoutFailed
          ? "Captured, but the payout failed — retry required"
          : verified
            ? "Waiting for the maintainer's second key"
            : "Locked until work is verified",
      at: bounty.payout?.paidAt || bounty.escrow.capturedAt,
      state: paid ? "done" : payoutFailed ? "error" : verified ? "active" : "pending",
    },
  ];

  return (
    <div className="pipeline">
      {steps.map((step, index) => (
        <div key={step.key} className={`pipe-step ${step.state}`}>
          <div className="pipe-dot" aria-hidden="true">
            {step.state === "done" ? "✓" : step.state === "error" ? "!" : index + 1}
          </div>
          <div className="pipe-content">
            <div className="pipe-title">{step.title}</div>
            <div className="pipe-desc">{step.desc}</div>
          </div>
          <div className="pipe-time">{step.at ? timeAgo(step.at) : "—"}</div>
        </div>
      ))}
    </div>
  );
}
