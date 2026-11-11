import { NextResponse } from "next/server";
import { getBounty } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bounty = await getBounty(id);
  if (!bounty) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  return NextResponse.json({ bounty });
}
