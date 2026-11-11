import Link from "next/link";
import { formatMoney, timeAgo } from "@/lib/format";
import { STATUS_LABEL, type Bounty, type BountyStatus } from "@/lib/types";
import { statusTone } from "@/lib/format";

export function StatusChip({ status }: { status: BountyStatus }) {
  return (
    <span className={`badge ${statusTone(status)}`}>
      <span aria-hidden="true" className="chip-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function BountyCard({ bounty }: { bounty: Bounty }) {
  const note =
    bounty.status === "PAID"
      ? "paid out"
      : bounty.status === "AWAITING_APPROVAL"
        ? "awaiting escrow"
        : bounty.status === "VERIFIED"
          ? "verified · releasing"
          : bounty.status === "NEEDS_WORK"
            ? "in escrow · needs work"
            : "in escrow";
  return (
    <Link href={`/bounties/${bounty.id}`} className="bounty-card">
      <div className="bounty-top">
        <span className="repo">
          {bounty.repo}#{bounty.issueNumber}
        </span>
        <StatusChip status={bounty.status} />
      </div>
      <h3 className="bounty-title">{bounty.title}</h3>
      <div className="bounty-bottom">
        <div>
          <div className="amount mono">{formatMoney(bounty.amountCents)}</div>
          <div className="amount-note">{note}</div>
        </div>
        <div className="meta">
          {bounty.contributorName}
          <br />
          {timeAgo(bounty.updatedAt)}
        </div>
      </div>
    </Link>
  );
}
