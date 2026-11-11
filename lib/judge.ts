import type { Bounty, JudgeCheck, JudgeVerdict, SubmissionInput } from "./types";

const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.anthropic.com/v1").replace(/\/$/, "");
const AI_API_KEY = process.env.AI_API_KEY?.trim();
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";

export interface ReviewResult {
  verdict: JudgeVerdict;
  score: number;
  checks: JudgeCheck[];
  summary: string;
  model: string;
  aiUsed: boolean;
}

const VERDICTS: JudgeVerdict[] = ["pass", "fail", "needs_review"];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalize(raw: unknown): ReviewResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const verdict = obj.verdict;
  if (typeof verdict !== "string" || !VERDICTS.includes(verdict as JudgeVerdict)) return null;
  const score = typeof obj.score === "number" ? clamp(Math.round(obj.score), 0, 100) : 0;
  const summary = typeof obj.summary === "string" ? obj.summary.slice(0, 800) : "";
  const checksRaw = Array.isArray(obj.checks) ? obj.checks : [];
  const checks: JudgeCheck[] = checksRaw
    .slice(0, 12)
    .map((c) => {
      const check = (c || {}) as Record<string, unknown>;
      return {
        criterion: String(check.criterion ?? "Unnamed criterion").slice(0, 200),
        met: Boolean(check.met),
        evidence: String(check.evidence ?? "").slice(0, 400),
      };
    })
    .filter((c) => c.criterion.trim().length > 0);
  if (!summary || checks.length === 0) return null;
  return { verdict: verdict as JudgeVerdict, score, checks, summary, model: AI_MODEL, aiUsed: true };
}

function keywords(text: string): string[] {
  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "from", "must", "should", "have", "will",
    "into", "when", "than", "then", "been", "does", "your", "their", "there", "which",
    "using", "used", "add", "adds", "added", "make", "makes", "code", "test", "tests",
  ]);
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((w) => w.length > 3 && !stop.has(w)),
    ),
  );
}

export function heuristicReview(bounty: Bounty, input: SubmissionInput): ReviewResult {
  const diff = input.diff || "";
  const tests = input.testOutput || "";
  const haystack = `${diff}\n${tests}`.toLowerCase();

  const checks: JudgeCheck[] = bounty.criteria.map((criterion) => {
    const words = keywords(criterion);
    const matched = words.filter((w) => haystack.includes(w));
    return {
      criterion,
      met: words.length === 0 ? false : matched.length / words.length >= 0.5,
      evidence:
        matched.length > 0
          ? `Patch mentions: ${matched.slice(0, 5).join(", ")}`
          : "No matching evidence found in the patch or test output",
    };
  });

  const coverage = checks.length ? checks.filter((c) => c.met).length / checks.length : 0;
  const testsLower = tests.toLowerCase();
  const explicitZero = /\b0\s+(failed|failures?|failing)\b/.test(testsLower);
  const nonzeroFail = /\b[1-9]\d*\s+(failed|failures?|failing)\b/.test(testsLower);
  const failureWord = /\b(fail|failed|failure|error|traceback)\b/.test(testsLower);
  const testsPassed = tests.trim().length > 0 && (explicitZero || (!nonzeroFail && !failureWord));

  const score = Math.round(
    30 + (testsPassed ? 30 : 0) + coverage * 30 + (diff.length > 200 ? 10 : 0),
  );

  let verdict: JudgeVerdict = "needs_review";
  if (diff.length < 20) verdict = "fail";
  else if (testsPassed && coverage >= 0.6 && diff.length >= 80) verdict = "pass";

  return {
    verdict,
    score: clamp(score, 0, 100),
    checks,
    summary: testsPassed
      ? `Deterministic review: tests pass and ${checks.filter((c) => c.met).length}/${checks.length} acceptance criteria have matching evidence. Maintainer confirmation still required.`
      : "Deterministic review: test evidence is missing or inconclusive. A maintainer should inspect this patch manually.",
    model: "bountyrail-heuristic-v1",
    aiUsed: false,
  };
}

async function callModel(bounty: Bounty, input: SubmissionInput): Promise<ReviewResult | null> {
  if (!AI_API_KEY) return null;
  const criteria = bounty.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const prompt = [
    `Bounty: ${bounty.title}`,
    `Repository: ${bounty.repo}`,
    `Issue: #${bounty.issueNumber}`,
    bounty.summary ? `Context: ${bounty.summary}` : "",
    `Acceptance criteria:\n${criteria}`,
    `Pull request: ${input.prUrl || "manual submission"}`,
    `Changed files: ${(input.files || []).join(", ") || "unknown"}`,
    `Test output:\n${(input.testOutput || "(none provided)").slice(0, 2500)}`,
    `Patch:\n${(input.diff || "(empty)").slice(0, 8000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You are BountyRail's strict review judge for open-source bounties. Decide whether the submitted patch satisfies every acceptance criterion. You never handle money and cannot approve payouts; you only produce evidence for a human. Be skeptical: unrelated, cosmetic, or test-disabling changes fail. Return ONLY valid JSON with this shape: {\"verdict\":\"pass\"|\"fail\"|\"needs_review\",\"score\":0-100,\"checks\":[{\"criterion\":string,\"met\":boolean,\"evidence\":string}],\"summary\":string}. Include exactly one check per acceptance criterion.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    return normalize(extractJson(content));
  } catch {
    return null;
  }
}

export async function judgeSubmission(bounty: Bounty, input: SubmissionInput): Promise<ReviewResult> {
  const modelResult = await callModel(bounty, input);
  if (modelResult) return modelResult;
  const fallback = heuristicReview(bounty, input);
  return {
    ...fallback,
    summary: `${fallback.summary} (AI model unavailable - deterministic fallback used.)`,
  };
}
