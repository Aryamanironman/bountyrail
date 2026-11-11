import Link from "next/link";
import { BountyCard } from "@/components/BountyCard";
import { SeedButton } from "@/components/SeedButton";
import { getBounty, insertBounty, listBounties } from "@/lib/db";
import { demoBounties } from "@/lib/demo";
import { formatMoney } from "@/lib/format";
import { paypalMode } from "@/lib/paypal";

export const dynamic = "force-dynamic";

async function loadBounties() {
  let bounties = await listBounties();
  if (bounties.length === 0 && process.env.AUTO_SEED !== "false") {
    for (const bounty of demoBounties()) {
      if (!(await getBounty(bounty.id))) await insertBounty(bounty);
    }
    bounties = await listBounties();
  }
  return bounties;
}

export default async function HomePage() {
  const bounties = await loadBounties();
  const mode = paypalMode();

  const locked = bounties
    .filter((b) => ["ESCROWED", "NEEDS_WORK", "VERIFIED"].includes(b.status))
    .reduce((sum, b) => sum + b.amountCents, 0);
  const verified = bounties.filter((b) => ["VERIFIED", "PAID"].includes(b.status)).length;
  const paidTotal = bounties
    .filter((b) => b.status === "PAID")
    .reduce((sum, b) => sum + b.amountCents, 0);

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">AI-verified · PayPal escrow</span>
            <h1>
              Bounties that <em>pay themselves.</em>
            </h1>
            <p className="hero-sub">
              A sponsor locks the money before work starts. An AI judge checks the pull request
              against every acceptance criterion. PayPal releases the moment a maintainer confirms
              — no chasing, no IOUs, no three-week wait.
            </p>
            <div className="hero-actions">
              <Link href="/bounties/new" className="btn btn-primary">
                Post a bounty
              </Link>
              <a href="#how" className="btn btn-ghost">
                See how it works
              </a>
            </div>
            <p className="hero-note">
              {mode === "live"
                ? "Connected to PayPal sandbox. Real order, authorization, capture and payout calls."
                : "Running in demo mode. Add PayPal sandbox credentials to see live order IDs."}
            </p>
          </div>

          <div className="hero-visual" aria-label="Example bounty flow">
            <div className="rail-card">
              <div className="rail-card-head">
                <div className="rail-card-title">
                  <strong>acme/httpkit#142</strong>
                  Retry with backoff
                </div>
                <span className="badge tone-green">Escrowed</span>
              </div>
              <div className="rail-nodes">
                <div className="rail-node done">
                  <span className="rail-node-dot" />
                  <div className="rail-node-label">Locked</div>
                  <div className="rail-node-value mono">$150.00</div>
                  <div className="rail-node-sub">PayPal auth</div>
                </div>
                <div className="rail-node done">
                  <span className="rail-node-dot" />
                  <div className="rail-node-label">Verified</div>
                  <div className="rail-node-value mono">92/100</div>
                  <div className="rail-node-sub">3 of 3 checks</div>
                </div>
                <div className="rail-node active">
                  <span className="rail-node-dot" />
                  <div className="rail-node-label">Paying</div>
                  <div className="rail-node-value mono">$150.00</div>
                  <div className="rail-node-sub">payout queued</div>
                </div>
              </div>
              <div className="rail-card-foot">
                <span>
                  <span className="live-dot" />
                  Live escrow ledger
                </span>
                <span>2 keys required</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Locked in escrow</div>
              <div className="stat-value mono">{formatMoney(locked)}</div>
              <div className="stat-sub">authorized, not captured</div>
            </div>
            <div className="stat">
              <div className="stat-label">AI verified</div>
              <div className="stat-value mono">{verified}</div>
              <div className="stat-sub">passing reviews</div>
            </div>
            <div className="stat">
              <div className="stat-label">Paid out</div>
              <div className="stat-value mono">{formatMoney(paidTotal)}</div>
              <div className="stat-sub">captured + settled</div>
            </div>
            <div className="stat">
              <div className="stat-label">Bounties</div>
              <div className="stat-value mono">{bounties.length}</div>
              <div className="stat-sub">on the rail</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="rail">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">The rail</div>
              <h2 className="section-title">Open bounties, funded up front</h2>
              <p className="section-sub">
                Every amount below is already held. The only question left is whether the patch
                earns it.
              </p>
            </div>
            <Link href="/bounties/new" className="btn btn-ghost btn-sm">
              New bounty
            </Link>
          </div>

          {bounties.length === 0 ? (
            <div className="empty">
              <h3>No bounties yet</h3>
              <p>Load the demo set to see the full escrow → review → payout flow.</p>
              <div style={{ marginTop: 18 }}>
                <SeedButton />
              </div>
            </div>
          ) : (
            <div className="bounty-grid">
              {bounties.map((bounty) => (
                <BountyCard key={bounty.id} bounty={bounty} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">How it works</div>
              <h2 className="section-title">Escrow first. Evidence second. Money last.</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step">
              <span className="step-num">1</span>
              <h3 className="step-title">Sponsor locks the bounty</h3>
              <p className="step-body">
                A PayPal authorization holds the full amount before the issue is announced. The
                contributor can see the money exists — it just isn’t theirs yet.
              </p>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <h3 className="step-title">AI verifies the patch</h3>
              <p className="step-body">
                The judge receives the diff, the test output and the acceptance criteria. It returns
                a verdict, a score, and one evidence line per criterion. It cannot move funds.
              </p>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <h3 className="step-title">Maintainer releases</h3>
              <p className="step-body">
                The human is the second key. One confirmation captures the authorization and sends a
                PayPal payout to the contributor’s email.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">Trust model</div>
              <h2 className="section-title">Why this is safe to fund</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step">
              <h3 className="step-title">Held, not taken</h3>
              <p className="step-body">
                Authorization reserves the sponsor’s funds. Capture happens only after verification
                and a human confirmation.
              </p>
            </div>
            <div className="step">
              <h3 className="step-title">AI is evidence, not authority</h3>
              <p className="step-body">
                The model produces a verdict and citations. It has no capture or payout credential,
                and the release endpoint rejects any request without explicit confirmation.
              </p>
            </div>
            <div className="step">
              <h3 className="step-title">Every step leaves an ID</h3>
              <p className="step-body">
                Order, authorization, capture and payout IDs are stored on the bounty and shown in
                the PayPal trail — so the ledger can be audited after the fact.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
