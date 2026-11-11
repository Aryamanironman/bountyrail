import { createHmac, timingSafeEqual } from "node:crypto";
import type { Bounty } from "./types";

export function verifyGithubSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface PullRequestPayload {
  action?: string;
  number?: number;
  pull_request?: {
    number?: number;
    merged?: boolean;
    html_url?: string;
    body?: string | null;
    user?: { login?: string };
    labels?: { name?: string }[];
    base?: { repo?: { full_name?: string } };
  };
  repository?: { full_name?: string };
}

export interface PrFile {
  filename: string;
  patch?: string;
}

export async function fetchPrFiles(
  repo: string,
  prNumber: number,
  token?: string,
): Promise<PrFile[]> {
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "BountyRail",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  return (await res.json()) as PrFile[];
}

export function renderDiff(files: PrFile[]): string {
  return files
    .slice(0, 40)
    .map((f) => `--- ${f.filename}\n${f.patch || "(binary or too large)"}`)
    .join("\n\n");
}

export function matchBounty(
  bounties: Bounty[],
  repo: string,
  prBody: string | null | undefined,
  labels: string[],
): Bounty | null {
  const body = prBody || "";
  const candidates = bounties.filter(
    (b) => b.repo.toLowerCase() === repo.toLowerCase() && b.status === "ESCROWED",
  );
  if (candidates.length === 0) return null;

  const direct = candidates.find(
    (b) =>
      body.includes(`#${b.issueNumber}`) ||
      body.includes(b.id) ||
      labels.includes(`bounty:${b.id}`) ||
      labels.includes("bountyrail"),
  );
  if (direct) return direct;

  // Fall back to the newest escrowed bounty for the repo when the PR body is silent.
  return candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}
