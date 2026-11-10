import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPackageId, isMock } from "./config";
import { getCircleEvents, type KoloEvent } from "./feed";
import {
  resetWriterRunState,
  resolveMemoryNetworkLabel,
  writeMemory,
  type WriteMemoryResult,
} from "./memory-writer";

export type MemoryCursor = {
  circleId: string;
  lastTimestampMs: number;
  lastTxDigest: string | null;
  updatedAt: string | null;
};

export type SyncMemoriesResult = {
  written: number;
  skipped: number;
  rateLimited: boolean;
  mock: boolean;
  network: string;
  results: WriteMemoryResult[];
};

function cursorPath(): string {
  const network = resolveMemoryNetworkLabel();
  return path.join(process.cwd(), `data/memory-cursor.${network}.json`);
}

export function readMemoryCursor(circleId: string): MemoryCursor {
  const file = cursorPath();
  if (!existsSync(file)) {
    return {
      circleId,
      lastTimestampMs: 0,
      lastTxDigest: null,
      updatedAt: null,
    };
  }
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as MemoryCursor;
    if (raw.circleId && raw.circleId !== circleId) {
      return {
        circleId,
        lastTimestampMs: 0,
        lastTxDigest: null,
        updatedAt: null,
      };
    }
    return {
      circleId,
      lastTimestampMs: raw.lastTimestampMs ?? 0,
      lastTxDigest: raw.lastTxDigest ?? null,
      updatedAt: raw.updatedAt ?? null,
    };
  } catch {
    return {
      circleId,
      lastTimestampMs: 0,
      lastTxDigest: null,
      updatedAt: null,
    };
  }
}

export function writeMemoryCursor(next: MemoryCursor): void {
  const file = cursorPath();
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        circleId: next.circleId,
        lastTimestampMs: next.lastTimestampMs,
        lastTxDigest: next.lastTxDigest,
        updatedAt: next.updatedAt ?? new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function isNewerThanCursor(event: KoloEvent, cursor: MemoryCursor): boolean {
  if (event.timestampMs > cursor.lastTimestampMs) return true;
  if (event.timestampMs < cursor.lastTimestampMs) return false;
  if (!cursor.lastTxDigest) return true;
  return event.txDigest !== cursor.lastTxDigest;
}

export async function syncMemories(
  circleId: string,
  opts?: { dryRun?: boolean; packageId?: string; events?: KoloEvent[] },
): Promise<SyncMemoriesResult> {
  resetWriterRunState();
  const mock = isMock();
  const network = resolveMemoryNetworkLabel();
  const cursor = readMemoryCursor(circleId);

  let events: KoloEvent[];
  if (opts?.events) {
    events = opts.events;
  } else {
    const feed = await getCircleEvents(circleId, {
      packageId: opts?.packageId ?? getPackageId(),
    });
    events = feed.events;
  }

  const candidates = events.filter(
    (e) =>
      (e.kind === "contributed" || e.kind === "paid_out") &&
      isNewerThanCursor(e, cursor),
  );

  const results: WriteMemoryResult[] = [];
  let written = 0;
  let skipped = 0;
  let rateLimited = false;
  let lastProcessed: KoloEvent | null = null;

  for (const event of candidates) {
    const result = await writeMemory(event, {
      dryRun: opts?.dryRun,
      allEvents: events,
    });
    results.push(result);
    lastProcessed = event;
    if (result.status === "written") written += 1;
    else if (result.status === "rate_limited") {
      rateLimited = true;
      break;
    } else skipped += 1;
  }

  if (lastProcessed && !opts?.dryRun) {
    writeMemoryCursor({
      circleId,
      lastTimestampMs: lastProcessed.timestampMs,
      lastTxDigest: lastProcessed.txDigest,
      updatedAt: new Date().toISOString(),
    });
  }

  return { written, skipped, rateLimited, mock, network, results };
}
