import type { Bounty } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export function JudgeReport({ bounty }: { bounty: Bounty }) {
  const submission = bounty.submission;
  if (!submission) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">AI review</h2>
        </div>
        <div className="panel-body">
          <p className="judge-summary">
            No submission yet. When a pull request arrives, the judge checks every acceptance
            criterion against the patch and the test output, then records the evidence here.
          </p>
        </div>
      </section>
    );
  }

  const pass = submission.verdict === "pass";
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">AI review</h2>
        <span className={`badge ${submission.aiUsed ? "tone-cyan" : "tone-muted"}`}>
          {submission.aiUsed ? "AI model" : "Deterministic fallback"}
        </span>
      </div>
      <div className="panel-body">
        <div className="judge-head">
          <div className="score" aria-label={`Score ${submission.score} out of 100`}>
            {submission.score}
            <small>/100</small>
          </div>
          <div>
            <p className="judge-summary">{submission.summary}</p>
            <p className="pipe-desc mono" style={{ marginTop: 8 }}>
              {submission.model} · {timeAgo(submission.reviewedAt)}
              {submission.prUrl ? ` · ${submission.prUrl}` : ""}
            </p>
          </div>
        </div>

        <div className="checks" role="list">
          {submission.checks.map((check, i) => (
            <div key={`${check.criterion}-${i}`} className={`check ${check.met ? "ok" : "no"}`} role="listitem">
              <span className="check-icon" aria-hidden="true">
                {check.met ? "✓" : "!"}
              </span>
              <span className="check-text">
                <strong>{check.criterion}</strong>
                <span>{check.evidence}</span>
              </span>
            </div>
          ))}
        </div>

        <details style={{ marginTop: 16 }}>
          <summary className="btn-link" style={{ cursor: "pointer", color: "var(--muted)" }}>
            View patch and test output
          </summary>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <pre className="evidence">{submission.diff || "(no patch)"}</pre>
            {submission.testOutput ? <pre className="evidence">{submission.testOutput}</pre> : null}
          </div>
        </details>

        <p className="action-note" style={{ textAlign: "left", marginTop: 14 }}>
          {pass
            ? "Evidence is sufficient, but the AI cannot move money. A maintainer must confirm before capture."
            : "The evidence does not satisfy every criterion. A maintainer can request changes or review manually."}
        </p>
      </div>
    </section>
  );
}
