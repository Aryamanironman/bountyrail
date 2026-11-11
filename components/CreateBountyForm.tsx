"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EMPTY = {
  title: "",
  repo: "",
  issueNumber: "",
  amount: "",
  criteria: "",
  contributorName: "",
  contributorEmail: "",
  summary: "",
};

export function CreateBountyForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const amountCents = Math.round(Number.parseFloat(form.amount) * 100);
      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          repo: form.repo,
          issueNumber: Number.parseInt(form.issueNumber, 10),
          amountCents,
          criteria: form.criteria,
          contributorName: form.contributorName,
          contributorEmail: form.contributorEmail,
          summary: form.summary,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        bounty?: { id: string };
      };
      if (!res.ok || !json.bounty) throw new Error(json.error || `Request failed (${res.status})`);
      router.push(`/bounties/${json.bounty.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create bounty");
      setBusy(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="title">Bounty title</label>
          <input
            id="title"
            required
            minLength={4}
            maxLength={120}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Add retry with exponential backoff to the HTTP client"
          />
        </div>

        <div className="field">
          <label htmlFor="repo">Repository</label>
          <input
            id="repo"
            required
            value={form.repo}
            onChange={(e) => set("repo", e.target.value)}
            placeholder="owner/name"
            pattern="^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$"
          />
          <span className="helper">GitHub owner/name. Used to match the webhook.</span>
        </div>

        <div className="field">
          <label htmlFor="issueNumber">Issue number</label>
          <input
            id="issueNumber"
            required
            type="number"
            min={1}
            value={form.issueNumber}
            onChange={(e) => set("issueNumber", e.target.value)}
            placeholder="142"
          />
        </div>

        <div className="field">
          <label htmlFor="amount">Bounty amount (USD)</label>
          <input
            id="amount"
            required
            type="number"
            min={1}
            max={10000}
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="150.00"
          />
          <span className="helper">Held as a PayPal authorization, captured only on release.</span>
        </div>

        <div className="field">
          <label htmlFor="contributorName">Contributor name</label>
          <input
            id="contributorName"
            value={form.contributorName}
            onChange={(e) => set("contributorName", e.target.value)}
            placeholder="Maya Okafor"
          />
        </div>

        <div className="field full">
          <label htmlFor="contributorEmail">Contributor PayPal email</label>
          <input
            id="contributorEmail"
            required
            type="email"
            value={form.contributorEmail}
            onChange={(e) => set("contributorEmail", e.target.value)}
            placeholder="maya@example.com"
          />
          <span className="helper">
            Payouts go to this email. Use a sandbox account when running live.
          </span>
        </div>

        <div className="field full">
          <label htmlFor="criteria">Acceptance criteria (one per line)</label>
          <textarea
            id="criteria"
            required
            value={form.criteria}
            onChange={(e) => set("criteria", e.target.value)}
            placeholder={
              "Retries failed requests three times with exponential backoff\nAdds unit tests covering timeout and 5xx paths\nPreserves the existing config defaults"
            }
            rows={5}
          />
          <span className="helper">
            The judge checks each line against the patch. Be specific enough to be falsifiable.
          </span>
        </div>

        <div className="field full">
          <label htmlFor="summary">Context (optional)</label>
          <textarea
            id="summary"
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Why this matters, constraints, anything the contributor should know."
            rows={3}
          />
        </div>
      </div>

      {error ? <p className="form-error" style={{ marginTop: 16 }}>{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <span className="spinner" /> : null}
          {busy ? "Creating escrow…" : "Lock escrow & post bounty"}
        </button>
        <span className="helper">
          The sponsor approves the authorization; no card details touch this app.
        </span>
      </div>
    </form>
  );
}
