import { NextResponse } from "next/server";
import { listBounties } from "@/lib/db";
import { createBounty, PipelineError } from "@/lib/pipeline";
import { PayPalError } from "@/lib/paypal";
import { parseCreateBounty } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const bounties = await listBounties();
  return NextResponse.json({ bounties });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseCreateBounty(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const bounty = await createBounty(parsed.value);
    return NextResponse.json({ bounty }, { status: 201 });
  } catch (error) {
    if (error instanceof PayPalError) {
      return NextResponse.json(
        { error: error.message, debugId: error.debugId },
        { status: 502 },
      );
    }
    if (error instanceof PipelineError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("create bounty failed", error);
    return NextResponse.json({ error: "Could not create bounty" }, { status: 500 });
  }
}
