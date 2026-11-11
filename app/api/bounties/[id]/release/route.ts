import { NextResponse } from "next/server";
import { PipelineError, releaseBounty } from "@/lib/pipeline";
import { PayPalError } from "@/lib/paypal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const confirm = Boolean((body as { confirm?: boolean })?.confirm);
  if (!confirm) {
    return NextResponse.json(
      { error: "Maintainer confirmation is required before funds move", code: "NO_CONFIRM" },
      { status: 400 },
    );
  }

  try {
    const result = await releaseBounty(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof PayPalError) {
      return NextResponse.json({ error: error.message, debugId: error.debugId }, { status: 502 });
    }
    if (error instanceof PipelineError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("release failed", error);
    return NextResponse.json({ error: "Could not release funds" }, { status: 500 });
  }
}
