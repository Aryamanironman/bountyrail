import { NextResponse } from "next/server";
import { getBounty, insertBounty } from "@/lib/db";
import { demoBounties } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (process.env.SEED_DISABLED === "true") {
    return NextResponse.json({ error: "Seeding is disabled" }, { status: 403 });
  }
  const created: string[] = [];
  for (const bounty of demoBounties()) {
    const existing = await getBounty(bounty.id);
    if (existing) continue;
    await insertBounty(bounty);
    created.push(bounty.id);
  }
  return NextResponse.json({ ok: true, created });
}
