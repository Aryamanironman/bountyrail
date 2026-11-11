import Link from "next/link";
import { notFound } from "next/navigation";
import { BountyActions } from "@/components/BountyActions";
import { StatusChip } from "@/components/BountyCard";
import { JudgeReport } from "@/components/JudgeReport";
import { Pipeline } from "@/components/Pipeline";
import { getBounty } from "@/lib/db";
import { formatMoney, shortId, timeAgo } from "@/lib/format";
import { paypalMode } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function BountyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bounty = await getBounty(id);
  if (!bounty) notFound();
  const mode = paypalMode();

  return (
    <main className="detail">
      <div className="container">
        <Link className="crumb" href="/">
          ← All bounties
        </Link>

        <div className="detail-head">
          <div className="detail-meta">
            <span className="repo">
              {bounty.repo}#{bounty.issueNumber}
            </span>
            <StatusChip status={bounty.status} />
            <span>posted {timeAgo(bounty.createdAt)}</span>
            <span className="mono" style={{ fontSize: 11.5 }}>
              {bounty.id}
            </span>
          </div>
          <h1 className="detail-title">{bounty.title}</h1>
          {bounty.summary ? <p className="section-sub">{bounty.summary}</p> : null}
        </div>

        <div className="detail-grid">
          <div className="main-col">
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">The rail</h2>
                <span className={`badge ${bounty.escrow.mode === "live" ? "tone-green" : "tone-amber"}`}>
                  {bounty.escrow.mode === "live" ? "PayPal sandbox" : "Simulated escrow"}
                </span>
              </div>
              <Pipeline bounty={bounty} />
            </section>

            <JudgeReport bounty={bounty} />

            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">Acceptance criteria</h2>
                <span className="repo">{bounty.criteria.length} checks</span>
              </div>
              <div className="panel-body">
                <ul className="criteria">
                  {bounty.criteria.map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <aside className="side-col">
            <section className="panel">
              <div className="panel-body">
                <div className="amount-big mono">{formatMoney(bounty.amountCents)}</div>
                <div className="amount-caption">
                  {bounty.status === "PAID"
                    ? `paid out · ${bounty.payout?.status || "settled"}`
                    : "held in PayPal escrow until verified and released"}
                </div>
                <BountyActions bounty={bounty} mode={mode} />
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">Parties</h2>
              </div>
              <div className="panel-body">
                <div className="kv">
                  <div className="kv-row">
                    <span className="kv-key">Sponsor</span>
                    <span className="kv-val">BountyRail escrow</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Contributor</span>
                    <span className="kv-val">{bounty.contributorName}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">PayPal email</span>
                    <span className="kv-val mono">{bounty.contributorEmail}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Repository</span>
                    <span className="kv-val">
                      <a
                        href={`https://github.com/${bounty.repo}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
                      >
                        {bounty.repo}
                      </a>
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Issue</span>
                    <span className="kv-val">
                      <a
                        href={bounty.issueUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
                      >
                        #{bounty.issueNumber}
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">PayPal trail</h2>
                <span className={`badge ${bounty.escrow.mode === "live" ? "tone-green" : "tone-muted"}`}>
                  {bounty.escrow.mode}
                </span>
              </div>
              <div className="panel-body">
                <div className="kv">
                  <div className="kv-row">
                    <span className="kv-key">Order</span>
                    <span className="kv-val mono">{bounty.escrow.orderId || "—"}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Authorization</span>
                    <span className="kv-val mono">{bounty.escrow.authorizationId || "—"}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Capture</span>
                    <span className="kv-val mono">{bounty.escrow.captureId || "—"}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Payout batch</span>
                    <span className="kv-val mono">{bounty.payout?.batchId || "—"}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-key">Payout item</span>
                    <span className="kv-val mono">
                      {bounty.payout?.itemId ? shortId(bounty.payout.itemId, 18) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
