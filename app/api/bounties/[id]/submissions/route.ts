import { NextResponse } from "next/server";
import { DEMO_SUBMISSION } from "@/lib/demo";
import { PipelineError, reviewBounty } from "@/lib/pipeline";
import { parseSubmission } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const useDemo = Boolean((body as { useDemo?: boolean })?.useDemo);
  const parsed = useDemo
    ? {
        ok: true as const,
        value: {
          diff: DEMO_SUBMISSION.diff,
          testOutput: DEMO_SUBMISSION.testOutput,
          files: DEMO_SUBMISSION.files,
          source: DEMO_SUBMISSION.source,
          prUrl: DEMO_SUBMISSION.prUrl,
          contributor: DEMO_SUBMISSION.contributor,
        },
      }
    : parseSubmission(body);
  if (!parsed.ok || !parsed.value) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { bounty } = await reviewBounty(id, parsed.value);
    return NextResponse.json({ bounty, ok: true });
  } catch (error) {
    if (error instanceof PipelineError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("review failed", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
