import { NextResponse } from "next/server";
import { authorizeBounty, PipelineError } from "@/lib/pipeline";
import { NeedsApprovalError, PayPalError } from "@/lib/paypal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const bounty = await authorizeBounty(id);
    return NextResponse.json({ bounty, ok: true });
  } catch (error) {
    if (error instanceof NeedsApprovalError) {
      return NextResponse.json(
        {
          error: "Approve the escrow in PayPal first",
          needsApproval: true,
          approveUrl: error.approveUrl,
        },
        { status: 409 },
      );
    }
    if (error instanceof PayPalError) {
      return NextResponse.json({ error: error.message, debugId: error.debugId }, { status: 502 });
    }
    if (error instanceof PipelineError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("authorize failed", error);
    return NextResponse.json({ error: "Could not authorize escrow" }, { status: 500 });
  }
}
