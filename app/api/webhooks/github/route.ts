import { NextResponse } from "next/server";
import { listBounties } from "@/lib/db";
import {
  fetchPrFiles,
  matchBounty,
  renderDiff,
  verifyGithubSignature,
  type PullRequestPayload,
} from "@/lib/github";
import { reviewBounty } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
  if (!secret) {
    return NextResponse.json(
      { error: "GITHUB_WEBHOOK_SECRET is not configured; refusing unsigned webhooks" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyGithubSignature(secret, raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventName = request.headers.get("x-github-event");
  if (eventName === "ping") return NextResponse.json({ ok: true, pong: true });
  if (eventName !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: `event ${eventName}` });
  }

  let payload: PullRequestPayload;
  try {
    payload = JSON.parse(raw) as PullRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pr = payload.pull_request;
  const repo = payload.repository?.full_name || pr?.base?.repo?.full_name || "";
  if (payload.action !== "closed" || !pr?.merged || !repo) {
    return NextResponse.json({ ok: true, ignored: "not a merged pull request" });
  }

  const labels = (pr.labels || []).map((l) => l.name || "").filter(Boolean);
  const bounties = await listBounties();
  const bounty = matchBounty(bounties, repo, pr.body, labels);
  if (!bounty) return NextResponse.json({ ok: true, matched: false });

  const files = await fetchPrFiles(repo, pr.number || payload.number || 0, process.env.GITHUB_TOKEN);
  const diff = renderDiff(files);

  const { bounty: reviewed } = await reviewBounty(bounty.id, {
    diff,
    testOutput:
      "GitHub webhook review: CI results are not exposed to this endpoint. The maintainer should attach test evidence before releasing funds.",
    files: files.map((f) => f.filename),
    source: "github",
    prUrl: pr.html_url,
    contributor: pr.user?.login,
  });

  return NextResponse.json(
    { ok: true, matched: true, bountyId: reviewed.id, verdict: reviewed.submission?.verdict },
    { status: 202 },
  );
}
