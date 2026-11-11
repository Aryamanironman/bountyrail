"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Bounty } from "@/lib/types";

type Busy = "escrow" | "review" | "release" | null;

export function BountyActions({ bounty, mode }: { bounty: Bounty; mode: "mock" | "live" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState(bounty.escrow.approveUrl);
  const [confirm, setConfirm] = useState(false);
  const [manual, setManual] = useState(false);
  const [diff, setDiff] = useState("");
  const [tests, setTests] = useState("");

  const money = formatMoney(bounty.amountCents);
  const canAuthorize = bounty.status === "AWAITING_APPROVAL";
  const canReview =
    bounty.status === "ESCROWED" || bounty.status === "NEEDS_WORK" || bounty.status === "VERIFIED";
  const canRelease = bounty.status === "VERIFIED";
  const payoutFailed = bounty.status === "PAYOUT_FAILED";
  const paid = bounty.status === "PAID";

  async function post(path: string, body: unknown, key: Busy) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        approveUrl?: string;
        needsApproval?: boolean;
        ok?: boolean;
        message?: string;
      };
      if (json.approveUrl) setApproveUrl(json.approveUrl);
      if (json.needsApproval) {
        setNotice("Approve the payment in PayPal, then click “I’ve approved — lock escrow”.");
        return;
      }
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      if (json.ok === false) setNotice(json.message || "Partial failure");
      else setNotice(json.message || "Updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="actions">
      {canAuthorize && (
        <>
          {mode === "live" && approveUrl ? (
            <a className="btn btn-primary btn-wide" href={approveUrl} target="_blank" rel="noreferrer">
              Approve escrow in PayPal ↗
            </a>
          ) : null}
          <button
            type="button"
            className={`btn ${mode === "live" && approveUrl ? "btn-ghost" : "btn-primary"} btn-wide`}
            disabled={busy !== null}
            onClick={() => post(`/api/bounties/${bounty.id}/escrow`, {}, "escrow")}
          >
            {busy === "escrow" ? <span className="spinner" /> : null}
            {mode === "live" && approveUrl
              ? "I’ve approved — lock escrow"
              : mode === "live"
                ? "Start PayPal approval"
                : "Authorize escrow (demo)"}
          </button>
          <p className="action-note">
            Authorizing holds the sponsor’s funds. Nothing is captured until verified work is
            released.
          </p>
        </>
      )}

      {canReview && (
        <>
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={busy !== null}
            onClick={() =>
              post(`/api/bounties/${bounty.id}/submissions`, { useDemo: true }, "review")
            }
          >
            {busy === "review" ? <span className="spinner" /> : null}
            {bounty.submission ? "Re-run AI review (demo patch)" : "Run AI review (demo patch)"}
          </button>
          <button type="button" className="btn-link" onClick={() => setManual((v) => !v)}>
            {manual ? "Hide manual evidence" : "Paste a real patch instead"}
          </button>
        </>
      )}

      {canReview && manual && (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="field">
            <label htmlFor="manual-diff">Patch diff</label>
            <textarea
              id="manual-diff"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder="--- a/file.py&#10;+++ b/file.py&#10;@@ ..."
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="manual-tests">Test output</label>
            <textarea
              id="manual-tests"
              value={tests}
              onChange={(e) => setTests(e.target.value)}
              placeholder="30 passed, 0 failed"
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-wide"
            disabled={busy !== null || diff.trim().length < 10}
            onClick={() =>
              post(
                `/api/bounties/${bounty.id}/submissions`,
                { diff, testOutput: tests, source: "manual" },
                "review",
              )
            }
          >
            {busy === "review" ? <span className="spinner spinner-light" /> : null}
            Submit for review
          </button>
        </div>
      )}

      {canRelease && (
        <div className="confirm-box">
          <p className="confirm-title">Second key required</p>
          <p className="action-note" style={{ textAlign: "left" }}>
            The AI verified {bounty.submission?.score}/100. Nothing moves until you confirm:
          </p>
          <label className="check-line">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            <span>
              I reviewed the evidence and authorize capture of {money} plus payout to{" "}
              {bounty.contributorEmail}.
            </span>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={!confirm || busy !== null}
            onClick={() => post(`/api/bounties/${bounty.id}/release`, { confirm: true }, "release")}
          >
            {busy === "release" ? <span className="spinner" /> : null}
            Release {money}
          </button>
        </div>
      )}

      {payoutFailed && (
        <button
          type="button"
          className="btn btn-danger btn-wide"
          disabled={busy !== null}
          onClick={() => post(`/api/bounties/${bounty.id}/release`, { confirm: true }, "release")}
        >
          {busy === "release" ? <span className="spinner spinner-light" /> : null}
          Retry payout
        </button>
      )}

      {paid && (
        <div className="notice notice-ok">
          Paid {money} to {bounty.contributorEmail}. Capture and payout IDs are in the PayPal trail.
        </div>
      )}

      {error ? <div className="notice notice-error">{error}</div> : null}
      {notice ? <div className="notice notice-warn">{notice}</div> : null}

      {mode === "mock" ? (
        <p className="action-note">
          Demo mode: PayPal order, authorization, capture and payout IDs are simulated. Add sandbox
          credentials in <span className="mono">.env.local</span> for live calls.
        </p>
      ) : null}
    </div>
  );
}
