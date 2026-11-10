import "server-only";
import { getPackageId } from "./config";
import {
  buildRoundCompleteMap,
  classifyTiming,
  getCircleEvents,
  type KoloEvent,
} from "./feed";
import { getMemory } from "./memory";
import {
  memoryNamespace,
  parseMemoryFromText,
  type KoloMemory,
} from "./memory-record";
import { readLedger, resolveMemoryNetworkLabel, type LedgerRow } from "./memory-writer";

export type TrustRound = {
  round: number;
  timing: "on_time" | "late" | null;
  kind: "paid" | "paid_out";
  txDigest: string;
  blobId: string | null;
  link: string | null;
};

export type MemberTrust = {
  circleId: string;
  member: string;
  onTime: number;
  late: number;
  paidOut: number;
  rounds: TrustRound[];
  blobIds: string[];
  source: "memory" | "ledger";
  network: string;
  nudge: string | null;
};

function addrEq(a: string, b: string): boolean {
  return a.replace(/^0x/i, "").toLowerCase() === b.replace(/^0x/i, "").toLowerCase();
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
  source: "memory" | "ledger",
  memberLabel: string,
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

  return {
    circleId,
    member,
    onTime,
    late,
    paidOut,
    rounds,
    blobIds: uniqueBlobs,
    source,
    network: resolveMemoryNetworkLabel(),
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
    mine.map(() => null),
    mine.map(() => null),
    circleId,
    member,
    "ledger",
    memberLabel,
  );
}

/**
 * Trust view read back from Walrus Memory recall (not the chain).
 * Falls back to the public ledger (+ feed) when recall fails.
 */
export async function getMemberTrust(
  circleId: string,
  member: string,
  opts?: { memberLabel?: string; packageId?: string },
): Promise<MemberTrust> {
  const memberLabel = opts?.memberLabel || "Member";
  const namespace = memoryNamespace(circleId);
  const query = `payments by ${member} in circle ${circleId}`;

  try {
    const client = await getMemory(namespace);
    const recalled = await client.recall({ query, limit: 20, namespace });
    const hits = recalled.results ?? [];
    const memories: KoloMemory[] = [];
    const blobIds: string[] = [];
    const links: Array<string | null> = [];
    for (const hit of hits) {
      const text = hit.text ?? "";
      const mem = parseMemoryFromText(text);
      if (!mem) continue;
      if (!addrEq(mem.member, member)) continue;
      memories.push(mem);
      const blobId = hit.blob_id ?? "";
      blobIds.push(blobId);
      links.push(
        blobId
          ? `https://walruscan.com/${resolveMemoryNetworkLabel() === "mainnet" ? "mainnet" : "testnet"}/blob/${blobId}`
          : null,
      );
    }
    if (memories.length > 0) {
      return fromMemories(memories, blobIds, links, circleId, member, "memory", memberLabel);
    }
  } catch {
    // fall through to ledger / feed
  }

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
