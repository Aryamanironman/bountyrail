import type { CreateBountyInput } from "./types";

export type ValidationResult =
  | { ok: true; value: CreateBountyInput }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseCreateBounty(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Expected a JSON body" };
  const input = body as Record<string, unknown>;

  const title = text(input.title, 120);
  if (title.length < 4) return { ok: false, error: "Title must be at least 4 characters" };

  const repo = text(input.repo, 140);
  if (!REPO_RE.test(repo)) return { ok: false, error: "Repo must look like owner/name" };

  const issueNumber = Number(input.issueNumber);
  if (!Number.isInteger(issueNumber) || issueNumber < 1 || issueNumber > 10_000_000) {
    return { ok: false, error: "Issue number must be a positive integer" };
  }

  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
    return { ok: false, error: "Amount must be between $1.00 and $10,000.00" };
  }

  const rawCriteria = Array.isArray(input.criteria)
    ? input.criteria
    : typeof input.criteria === "string"
      ? input.criteria.split(/\n+/)
      : [];
  const criteria = rawCriteria
    .map((c) => text(c, 300))
    .filter((c) => c.length > 0)
    .slice(0, 8);
  if (criteria.length === 0) {
    return { ok: false, error: "Add at least one acceptance criterion" };
  }

  const contributorEmail = text(input.contributorEmail, 160).toLowerCase();
  if (!EMAIL_RE.test(contributorEmail)) {
    return { ok: false, error: "Contributor email is not valid" };
  }

  return {
    ok: true,
    value: {
      title,
      summary: text(input.summary, 400),
      repo,
      issueNumber,
      amountCents,
      criteria,
      contributorEmail,
      contributorName: text(input.contributorName, 80) || undefined,
    },
  };
}

export function parseSubmission(body: unknown): {
  ok: boolean;
  error?: string;
  value?: {
    diff: string;
    testOutput: string;
    files: string[];
    source: "manual" | "github";
    prUrl?: string;
    contributor?: string;
  };
} {
  if (!body || typeof body !== "object") return { ok: false, error: "Expected a JSON body" };
  const input = body as Record<string, unknown>;
  const diff = typeof input.diff === "string" ? input.diff.slice(0, 20_000) : "";
  const testOutput = typeof input.testOutput === "string" ? input.testOutput.slice(0, 10_000) : "";
  if (diff.trim().length < 10 && testOutput.trim().length < 10) {
    return { ok: false, error: "Provide a patch diff or test output" };
  }
  const files = Array.isArray(input.files)
    ? input.files.map((f) => String(f).slice(0, 200)).slice(0, 50)
    : [];
  return {
    ok: true,
    value: {
      diff,
      testOutput,
      files,
      source: input.source === "github" ? "github" : "manual",
      prUrl: typeof input.prUrl === "string" ? input.prUrl.slice(0, 500) : undefined,
      contributor: typeof input.contributor === "string" ? input.contributor.slice(0, 100) : undefined,
    },
  };
}
