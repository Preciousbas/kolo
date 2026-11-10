import "server-only";
import { unstable_cache } from "next/cache";
import { getPackageId } from "./config";
import {
  buildRoundCompleteMap,
  classifyTiming,
  getCircleEvents,
  type KoloEvent,
} from "./feed";
import { getMemory, type RecallResult } from "./memory";
import {
  memoryNamespace,
  parseMemoryFromText,
  type KoloMemory,
} from "./memory-record";
import { readLedger, resolveMemoryNetworkLabel, type LedgerRow } from "./memory-writer";
import { listUserCircleIds } from "./circle-registry";
import {
  filterSavedMemoriesForAddress,
  filterSavedMemoriesForMember,
  readSavedMainnetMemories,
  type SavedMainnetMemory,
} from "./saved-memories";

export type TrustRound = {
  round: number;
  timing: "on_time" | "late" | null;
  kind: "paid" | "paid_out";
  txDigest: string;
  blobId: string | null;
  link: string | null;
};

export type MemberTrustSource = "memory" | "ledger" | "memory (saved index)";

export type MemberTrust = {
  circleId: string;
  member: string;
  onTime: number;
  late: number;
  paidOut: number;
  rounds: TrustRound[];
  blobIds: string[];
  source: MemberTrustSource;
  network: string;
  nudge: string | null;
};

export const MEMORY_RECALL_TIMEOUT_MS = 8_000;
export const MEMORY_RECALL_REVALIDATE_SECONDS = 300;

function addrEq(a: string, b: string): boolean {
  return a.replace(/^0x/i, "").toLowerCase() === b.replace(/^0x/i, "").toLowerCase();
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function buildNudge(args: {
  onTime: number;
  late: number;
  memberLabel: string;
}): string | null {
  if (args.late >= 2) {
    return `${args.memberLabel} was late twice. Kolo will remind ${args.memberLabel} a day earlier.`;
  }
  if (args.late === 1) {
    return `${args.memberLabel} was late once. Kolo is watching the next round.`;
  }
  if (args.onTime >= 2) {
    return `${args.memberLabel} paid on time ${args.onTime} rounds. Kolo remembers.`;
  }
  return null;
}

function fromMemories(
  memories: KoloMemory[],
  blobIds: string[],
  links: Array<string | null>,
  circleId: string,
  member: string,
  source: MemberTrustSource,
  memberLabel: string,
  network?: string,
): MemberTrust {
  const byDigest = new Map<string, { mem: KoloMemory; blobId: string | null; link: string | null }>();
  memories.forEach((mem, i) => {
    if (!addrEq(mem.member, member)) return;
    if (mem.circleId && !addrEq(mem.circleId, circleId) && mem.circleId !== circleId) return;
    const prev = byDigest.get(mem.txDigest);
    if (!prev) {
      byDigest.set(mem.txDigest, {
        mem,
        blobId: blobIds[i] ?? null,
        link: links[i] ?? null,
      });
    }
  });

  const rounds: TrustRound[] = [...byDigest.values()]
    .map(({ mem, blobId, link }) => ({
      round: mem.round,
      timing: mem.timing,
      kind: mem.kind,
      txDigest: mem.txDigest,
      blobId,
      link,
    }))
    .sort((a, b) => a.round - b.round || a.kind.localeCompare(b.kind));

  const paid = rounds.filter((r) => r.kind === "paid");
  const onTime = paid.filter((r) => r.timing === "on_time").length;
  const late = paid.filter((r) => r.timing === "late").length;
  const paidOut = rounds.filter((r) => r.kind === "paid_out").length;
  const uniqueBlobs = [
    ...new Set(rounds.map((r) => r.blobId).filter((b): b is string => Boolean(b))),
  ];

  const resolvedNetwork =
    network ??
    (source === "memory (saved index)" ? "mainnet" : resolveMemoryNetworkLabel());
  const displayNetwork =
    resolvedNetwork === "mock"
      ? process.env.KOLO_MEMORY_NETWORK === "mainnet"
        ? "mainnet"
        : "testnet"
      : resolvedNetwork;

  return {
    circleId,
    member,
    onTime,
    late,
    paidOut,
    rounds,
    blobIds: uniqueBlobs,
    source,
    network: displayNetwork,
    nudge: buildNudge({ onTime, late, memberLabel }),
  };
}

function ledgerToTrust(
  rows: LedgerRow[],
  circleId: string,
  member: string,
  memberLabel: string,
): MemberTrust {
  const mine = rows.filter(
    (r) => addrEq(r.member, member) && (r.circleId === circleId || addrEq(r.circleId, circleId)),
  );
  const memories: KoloMemory[] = mine.map((r) => ({
    v: 1,
    app: "kolo",
    kind: r.kind,
    circleId: r.circleId,
    round: r.round,
    member: r.member,
    timing: r.timing,
    amountRaw: "0",
    coinType: "",
    decimals: 6,
    at: r.writtenAt,
    txDigest: r.txDigest,
    escrowNetwork: "testnet",
  }));
  return fromMemories(
    memories,
    mine.map((r) => r.blobId),
    mine.map((r) => r.link),
    circleId,
    member,
    "ledger",
    memberLabel,
  );
}

function savedIndexToTrust(
  rows: SavedMainnetMemory[],
  circleId: string,
  member: string,
  memberLabel: string,
): MemberTrust {
  const mine = filterSavedMemoriesForMember(rows, circleId, member);
  const memories: KoloMemory[] = mine.map((r) => ({
    v: 1,
    app: "kolo",
    kind: r.kind,
    circleId: r.circleId,
    round: r.round,
    member: r.member,
    timing: r.timing,
    amountRaw: "0",
    coinType: "",
    decimals: 6,
    at: r.writtenAt,
    txDigest: r.txDigest,
    escrowNetwork: "testnet",
  }));
  return fromMemories(
    memories,
    mine.map((r) => r.blobId),
    mine.map((r) => r.link || `https://walruscan.com/mainnet/blob/${r.blobId}`),
    circleId,
    member,
    "memory (saved index)",
    memberLabel,
    "mainnet",
  );
}

function eventsToTrust(
  events: KoloEvent[],
  circleId: string,
  member: string,
  memberLabel: string,
): MemberTrust {
  const roundCompleteAt = buildRoundCompleteMap(events);
  const mine = events.filter(
    (e) =>
      addrEq(e.member, member) &&
      (e.kind === "contributed" || e.kind === "paid_out"),
  );
  const memories: KoloMemory[] = mine.map((e) => {
    const timing =
      e.kind === "paid_out"
        ? null
        : classifyTiming({ event: e, roundCompleteAt }) === "late"
          ? "late"
          : "on_time";
    return {
      v: 1,
      app: "kolo" as const,
      kind: e.kind === "contributed" ? ("paid" as const) : ("paid_out" as const),
      circleId: e.circleId,
      round: e.round,
      member: e.member,
      timing,
      amountRaw: e.amountRaw,
      coinType: e.coinType,
      decimals: e.decimals,
      at: new Date(e.timestampMs || Date.now()).toISOString(),
      txDigest: e.txDigest,
      escrowNetwork: "testnet" as const,
    };
  });
  return fromMemories(
    memories,
    mine.map(() => ""),
    mine.map(() => null),
    circleId,
    member,
    "ledger",
    memberLabel,
  );
}

function trustFromRecallHits(
  hits: NonNullable<RecallResult["results"]>,
  circleId: string,
  member: string,
  memberLabel: string,
): MemberTrust | null {
  const memories: KoloMemory[] = [];
  const blobIds: string[] = [];
  const links: Array<string | null> = [];
  const netLabel = resolveMemoryNetworkLabel();
  const walrusNet = netLabel === "mainnet" ? "mainnet" : "testnet";
  for (const hit of hits) {
    const text = hit.text ?? "";
    const mem = parseMemoryFromText(text);
    if (!mem) continue;
    if (!addrEq(mem.member, member)) continue;
    memories.push(mem);
    const blobId = hit.blob_id ?? "";
    blobIds.push(blobId);
    links.push(blobId ? `https://walruscan.com/${walrusNet}/blob/${blobId}` : null);
  }
  if (memories.length === 0) return null;
  return fromMemories(memories, blobIds, links, circleId, member, "memory", memberLabel);
}

async function liveRecallUncached(
  circleId: string,
  member: string,
  namespace: string,
): Promise<RecallResult> {
  const client = await getMemory(namespace);
  const query = `payments by ${member} in circle ${circleId}`;
  return client.recall({ query, limit: 20, namespace });
}

/** Successful live recalls are cached ~5 minutes so most loads skip MemWal. */
async function liveRecallCached(
  circleId: string,
  member: string,
  namespace: string,
): Promise<RecallResult> {
  const cached = unstable_cache(
    () => liveRecallUncached(circleId, member, namespace),
    ["kolo-memwal-recall", circleId, member, namespace],
    { revalidate: MEMORY_RECALL_REVALIDATE_SECONDS },
  );
  return cached();
}

/**
 * Trust view read back from Walrus Memory recall (not the chain).
 * On live recall timeout/error/empty → committed data/memories.mainnet.json,
 * then public ledger (+ feed). Never MemWalMock in production/mainnet.
 */
export async function getMemberTrust(
  circleId: string,
  member: string,
  opts?: {
    memberLabel?: string;
    packageId?: string;
    recallTimeoutMs?: number;
  },
): Promise<MemberTrust> {
  const memberLabel = opts?.memberLabel || "Member";
  const namespace = memoryNamespace(circleId);
  const timeoutMs = opts?.recallTimeoutMs ?? MEMORY_RECALL_TIMEOUT_MS;

  try {
    const recalled = await withTimeout(
      liveRecallCached(circleId, member, namespace),
      timeoutMs,
      "memory recall",
    );
    const fromLive = trustFromRecallHits(recalled.results ?? [], circleId, member, memberLabel);
    if (fromLive) return fromLive;
  } catch {
    // fall through to saved index / ledger / feed
  }

  const fromSaved = savedIndexToTrust(
    readSavedMainnetMemories(),
    circleId,
    member,
    memberLabel,
  );
  if (fromSaved.rounds.length > 0) return fromSaved;

  const ledger = readLedger();
  const fromLedger = ledgerToTrust(ledger, circleId, member, memberLabel);
  if (fromLedger.rounds.length > 0) return fromLedger;

  try {
    const feed = await getCircleEvents(circleId, {
      packageId: opts?.packageId ?? getPackageId() ?? undefined,
    });
    return eventsToTrust(feed.events, circleId, member, memberLabel);
  } catch {
    return fromLedger;
  }
}

export type AddressTrustSummary = {
  onTime: number;
  late: number;
  paidRounds: number;
  paidOut: number;
  hasRecord: boolean;
  blobLink: string | null;
  source: MemberTrustSource | "none";
  network: string;
  /** Counts only — never includes personal names. */
  line: string;
};

/** Invite-screen copy: counts only, optional Walrus storage mention. */
export function formatInviteTrustLine(args: {
  onTime: number;
  late: number;
  hasRecord: boolean;
  blobLink?: string | null;
}): string {
  if (!args.hasRecord) return "New to Kolo, no record yet";
  const paid = args.onTime + args.late;
  const base = `Paid on time ${args.onTime} of ${Math.max(paid, args.onTime)} rounds`;
  return args.blobLink ? `${base} · stored on Walrus` : base;
}

function emptyTrustSummary(): AddressTrustSummary {
  return {
    onTime: 0,
    late: 0,
    paidRounds: 0,
    paidOut: 0,
    hasRecord: false,
    blobLink: null,
    source: "none",
    network: "mainnet",
    line: formatInviteTrustLine({ onTime: 0, late: 0, hasRecord: false }),
  };
}

function summaryFromSavedAddress(member: string): AddressTrustSummary {
  const saved = filterSavedMemoriesForAddress(readSavedMainnetMemories(), member);
  if (saved.length === 0) return emptyTrustSummary();

  let onTime = 0;
  let late = 0;
  let paidOut = 0;
  let blobLink: string | null = null;
  const seen = new Set<string>();
  for (const row of saved) {
    const key = `${row.txDigest}:${row.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (row.kind === "paid") {
      if (row.timing === "late") late += 1;
      else onTime += 1;
    } else {
      paidOut += 1;
    }
    if (!blobLink) {
      blobLink = row.link || `https://walruscan.com/mainnet/blob/${row.blobId}`;
    }
  }
  const paidRounds = onTime + late;
  const hasRecord = paidRounds + paidOut > 0;
  return {
    onTime,
    late,
    paidRounds,
    paidOut,
    hasRecord,
    blobLink,
    source: "memory (saved index)",
    network: "mainnet",
    line: formatInviteTrustLine({ onTime, late, hasRecord, blobLink }),
  };
}

/**
 * Trust counts for a wallet across every circle we know about.
 * Uses getMemberTrust per circle (timeout + saved-index fallback), then
 * falls back to aggregating data/memories.mainnet.json for that address.
 */
export async function getAddressTrustSummary(
  member: string,
  opts?: { recallTimeoutMs?: number; packageId?: string },
): Promise<AddressTrustSummary> {
  const circleIds = new Set<string>();
  for (const row of filterSavedMemoriesForAddress(readSavedMainnetMemories(), member)) {
    circleIds.add(row.circleId);
  }
  try {
    for (const id of await listUserCircleIds(member)) circleIds.add(id);
  } catch {
    // registry unavailable — saved index is enough
  }

  if (circleIds.size === 0) {
    return summaryFromSavedAddress(member);
  }

  let onTime = 0;
  let late = 0;
  let paidOut = 0;
  let blobLink: string | null = null;
  let source: MemberTrustSource | "none" = "none";
  let network = "mainnet";
  const seen = new Set<string>();

  for (const circleId of circleIds) {
    const trust = await getMemberTrust(circleId, member, {
      memberLabel: "Member",
      recallTimeoutMs: opts?.recallTimeoutMs,
      packageId: opts?.packageId,
    });
    for (const round of trust.rounds) {
      const key = `${round.txDigest}:${round.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (round.kind === "paid") {
        if (round.timing === "late") late += 1;
        else if (round.timing === "on_time") onTime += 1;
      } else {
        paidOut += 1;
      }
      if (!blobLink && round.link) blobLink = round.link;
    }
    if (trust.rounds.length > 0) {
      source = trust.source;
      network = trust.network === "mock" ? "mainnet" : trust.network;
    }
  }

  if (onTime + late + paidOut === 0) {
    return summaryFromSavedAddress(member);
  }

  const paidRounds = onTime + late;
  const hasRecord = paidRounds + paidOut > 0;
  return {
    onTime,
    late,
    paidRounds,
    paidOut,
    hasRecord,
    blobLink,
    source,
    network,
    line: formatInviteTrustLine({ onTime, late, hasRecord, blobLink }),
  };
}
