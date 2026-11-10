import "server-only";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  isMock,
  memoryMaxPerRun,
  memoryMaxTotal,
  memoryNetwork,
} from "./config";
import { getMemory, type MemoryClient, type RememberResult } from "./memory";
import { toMemory, type KoloMemory } from "./memory-record";
import type { KoloEvent } from "./feed";
import { redact } from "./redact";

export type MemoryNetworkLabel = "testnet" | "mainnet" | "mock";

export type LedgerRow = {
  key: string;
  circleId: string;
  round: number;
  member: string;
  kind: KoloMemory["kind"];
  timing: KoloMemory["timing"];
  txDigest: string;
  blobId: string;
  memoryId: string;
  jobId?: string;
  owner?: string;
  network: MemoryNetworkLabel;
  writtenAt: string;
  points: 5;
  link: string;
};

export type WriteMemoryResult =
  | { status: "written"; row: LedgerRow }
  | { status: "skipped"; reason: "duplicate" | "cap_total" | "cap_run" | "dry_run"; key: string }
  | { status: "rate_limited"; written: number; key: string };

const POINTS_PER_MEMORY = 5;

/** Run-scoped write counter (reset via resetWriterRunState). */
let runWritten = 0;

export function resetWriterRunState() {
  runWritten = 0;
}

export function getRunWritten(): number {
  return runWritten;
}

export function resolveMemoryNetworkLabel(): MemoryNetworkLabel {
  if (isMock()) return "mock";
  return memoryNetwork();
}

export function ledgerPath(network: MemoryNetworkLabel = resolveMemoryNetworkLabel()): string {
  return path.join(process.cwd(), `data/memory-ledger.${network}.json`);
}

export function costsLogPath(): string {
  return path.join(process.cwd(), "data/memory-costs.log");
}

export function memoryKey(event: Pick<KoloEvent, "txDigest" | "kind" | "member">): string {
  const kind = event.kind === "contributed" ? "paid" : event.kind;
  return `${event.txDigest}:${kind}:${event.member.toLowerCase()}`;
}

/** // UNCONFIRMED: Walruscan URL pattern — /testnet/blob/<id> opens a blob page shell. */
export function walruscanBlobLink(network: MemoryNetworkLabel, blobId: string): string {
  const net = network === "mock" ? "testnet" : network;
  return `https://walruscan.com/${net}/blob/${blobId}`;
}

export function readLedger(network?: MemoryNetworkLabel): LedgerRow[] {
  const file = ledgerPath(network ?? resolveMemoryNetworkLabel());
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as LedgerRow[]) : [];
  } catch {
    return [];
  }
}

function writeLedger(rows: LedgerRow[], network: MemoryNetworkLabel): void {
  const file = ledgerPath(network);
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

function hourBucket(iso: string): string {
  return iso.slice(0, 13);
}

function pointsThisHour(rows: LedgerRow[], nowIso: string): number {
  const bucket = hourBucket(nowIso);
  return rows
    .filter((r) => hourBucket(r.writtenAt) === bucket)
    .reduce((sum, r) => sum + (r.points || POINTS_PER_MEMORY), 0);
}

export function appendCostLog(line: {
  network: MemoryNetworkLabel;
  kind: string;
  points: number;
  totalPointsThisHour: number;
  totalMemories: number;
  action: "write" | "skip" | "rate_limit";
}): void {
  const file = costsLogPath();
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString();
  const row = redact(
    `${stamp} ${line.network} ${line.kind} ${line.action} points=${line.points} totalPointsThisHour=${line.totalPointsThisHour} totalMemories=${line.totalMemories}`,
  );
  appendFileSync(file, `${row}\n`, "utf8");
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { status?: number; message?: string; name?: string };
  if (err.status === 429) return true;
  if (typeof err.name === "string" && /RateLimited/i.test(err.name)) return true;
  if (typeof err.message === "string" && /\b429\b|rate.?limit/i.test(err.message)) return true;
  return false;
}

export async function writeMemory(
  event: KoloEvent,
  opts: {
    dryRun?: boolean;
    allEvents?: KoloEvent[];
    client?: MemoryClient;
  } = {},
): Promise<WriteMemoryResult> {
  if (event.kind === "created") {
    return { status: "skipped", reason: "duplicate", key: memoryKey(event) };
  }
  if (event.kind !== "contributed" && event.kind !== "paid_out") {
    return { status: "skipped", reason: "duplicate", key: memoryKey(event) };
  }

  const network = resolveMemoryNetworkLabel();
  const key = memoryKey(event);
  const ledger = readLedger(network);

  if (ledger.some((row) => row.key === key)) {
    appendCostLog({
      network,
      kind: event.kind,
      points: 0,
      totalPointsThisHour: pointsThisHour(ledger, new Date().toISOString()),
      totalMemories: ledger.length,
      action: "skip",
    });
    return { status: "skipped", reason: "duplicate", key };
  }

  if (ledger.length >= memoryMaxTotal()) {
    appendCostLog({
      network,
      kind: event.kind,
      points: 0,
      totalPointsThisHour: pointsThisHour(ledger, new Date().toISOString()),
      totalMemories: ledger.length,
      action: "skip",
    });
    return { status: "skipped", reason: "cap_total", key };
  }

  if (runWritten >= memoryMaxPerRun()) {
    appendCostLog({
      network,
      kind: event.kind,
      points: 0,
      totalPointsThisHour: pointsThisHour(ledger, new Date().toISOString()),
      totalMemories: ledger.length,
      action: "skip",
    });
    return { status: "skipped", reason: "cap_run", key };
  }

  const { memory, text, namespace } = toMemory(event, opts.allEvents);

  if (opts.dryRun) {
    return { status: "skipped", reason: "dry_run", key };
  }

  const client = opts.client ?? (await getMemory(namespace));

  let result: RememberResult;
  try {
    result = await client.rememberAndWait(text, namespace, { timeoutMs: 60_000 });
  } catch (error) {
    if (isRateLimitError(error)) {
      appendCostLog({
        network,
        kind: memory.kind,
        points: 0,
        totalPointsThisHour: pointsThisHour(ledger, new Date().toISOString()),
        totalMemories: ledger.length,
        action: "rate_limit",
      });
      return { status: "rate_limited", written: runWritten, key };
    }
    throw error;
  }

  const writtenAt = new Date().toISOString();
  const row: LedgerRow = {
    key,
    circleId: memory.circleId,
    round: memory.round,
    member: memory.member,
    kind: memory.kind,
    timing: memory.timing,
    txDigest: memory.txDigest,
    blobId: result.blob_id,
    memoryId: result.id,
    jobId: result.job_id,
    owner: result.owner,
    network,
    writtenAt,
    points: POINTS_PER_MEMORY,
    link: walruscanBlobLink(network, result.blob_id),
  };

  const next = [...ledger, row];
  writeLedger(next, network);
  runWritten += 1;

  appendCostLog({
    network,
    kind: memory.kind,
    points: POINTS_PER_MEMORY,
    totalPointsThisHour: pointsThisHour(next, writtenAt),
    totalMemories: next.length,
    action: "write",
  });

  return { status: "written", row };
}

/** Append a ledger row from a successful bulk write (demo script). */
export function appendLedgerRow(row: LedgerRow): void {
  const network = row.network;
  const ledger = readLedger(network);
  if (ledger.some((r) => r.key === row.key)) return;
  const next = [...ledger, row];
  writeLedger(next, network);
  runWritten += 1;
  appendCostLog({
    network,
    kind: row.kind,
    points: row.points,
    totalPointsThisHour: pointsThisHour(next, row.writtenAt),
    totalMemories: next.length,
    action: "write",
  });
}
