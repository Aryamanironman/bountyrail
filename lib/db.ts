import { constants, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { demoBounties } from "./demo";
import type { Bounty } from "./types";

interface DB {
  bounties: Bounty[];
}

let cache: DB | null = null;
let dirPromise: Promise<string> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function resolveDataDir(): Promise<string> {
  const preferred = process.env.DATA_DIR || path.join(process.cwd(), ".data");
  try {
    await fs.mkdir(preferred, { recursive: true });
    await fs.access(preferred, constants.W_OK);
    return preferred;
  } catch {
    // Serverless filesystems (Vercel) are read-only outside /tmp.
    const fallback = path.join(os.tmpdir(), "bountyrail-data");
    await fs.mkdir(fallback, { recursive: true });
    return fallback;
  }
}

async function dataDir(): Promise<string> {
  if (!dirPromise) dirPromise = resolveDataDir();
  return dirPromise;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function load(): Promise<DB> {
  if (cache) return cache;
  const dir = await dataDir();
  try {
    const raw = await fs.readFile(path.join(dir, "db.json"), "utf8");
    const parsed = JSON.parse(raw) as DB;
    cache = { bounties: Array.isArray(parsed.bounties) ? parsed.bounties : [] };
  } catch {
    cache = { bounties: [] };
  }
  return cache;
}

async function persist(): Promise<void> {
  if (!cache) return;
  const dir = await dataDir();
  const target = path.join(dir, "db.json");
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(cache, null, 2), "utf8");
  await fs.rename(temp, target);
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Serverless hosts give each instance its own /tmp. Seed the demo set on first
 * touch so the hosted demo is populated on any instance, not just the one that
 * served the home page.
 */
async function seedIfEmpty(db: DB): Promise<void> {
  if (process.env.AUTO_SEED === "false" || db.bounties.length > 0) return;
  for (const bounty of demoBounties()) {
    if (!db.bounties.some((b) => b.id === bounty.id)) db.bounties.push(bounty);
  }
  try {
    await persist();
  } catch {
    // Read-only host: keep the seeded set in memory for this instance.
  }
}

export async function listBounties(): Promise<Bounty[]> {
  await load();
  await seedIfEmpty(cache!);
  return clone(cache!.bounties).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBounty(id: string): Promise<Bounty | null> {
  await load();
  await seedIfEmpty(cache!);
  const found = cache!.bounties.find((b) => b.id === id);
  return found ? clone(found) : null;
}

export async function insertBounty(bounty: Bounty): Promise<Bounty> {
  return withLock(async () => {
    const db = await load();
    db.bounties.push(bounty);
    await persist();
    return clone(bounty);
  });
}

export async function updateBounty(
  id: string,
  mutate: (bounty: Bounty) => void,
): Promise<Bounty | null> {
  return withLock(async () => {
    const db = await load();
    const found = db.bounties.find((b) => b.id === id);
    if (!found) return null;
    mutate(found);
    found.updatedAt = new Date().toISOString();
    await persist();
    return clone(found);
  });
}

export async function resetStore(): Promise<void> {
  return withLock(async () => {
    cache = { bounties: [] };
    await persist();
  });
}
