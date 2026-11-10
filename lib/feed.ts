import "server-only";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  getCoinType,
  getNetworkName,
  getPackageId,
  tatumApiKey,
} from "./config";
import {
  parseCircleState,
  type CircleView,
  type PaidOutEvent,
} from "./circle";
import {
  fullnodeGraphql,
  tatumGraphql,
  tatumGrpc,
  withTatumFallback,
  type TransportVia,
} from "./tatum";
import { fillPayoutNgn } from "./price";

export type KoloEventKind = "created" | "contributed" | "paid_out";

export type KoloEvent = {
  kind: KoloEventKind;
  circleId: string;
  round: number;
  member: string; // payer, or recipient for paid_out
  amountRaw: string;
  coinType: string;
  decimals: number;
  roundComplete?: boolean;
  auto?: boolean;
  txDigest: string;
  checkpoint: string | null;
  timestampMs: number;
  explorerUrl: string;
  via: TransportVia;
};

export type TimingClass = "on_time" | "late" | "last";

export type MemberHistoryItem = KoloEvent & {
  timing?: TimingClass;
};

export type MemberHistory = {
  address: string;
  circleId: string;
  events: MemberHistoryItem[];
  onTimeCount: number;
  lateCount: number;
  lastCount: number;
};

export type FeedCursor = {
  cursor: string | null;
  lastCheckpoint: string | null;
  updatedAt: string | null;
};

type JsonRecord = Record<string, unknown>;

const SUI_TYPE = "0x2::sui::SUI";
const DECIMALS_USDC = 6;
const DECIMALS_SUI = 9;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function explorerTxUrl(digest: string): string {
  return `https://suiscan.xyz/${getNetworkName()}/tx/${digest}`;
}

function circleMatches(circle: string, circleId: string): boolean {
  if (!circle) return true;
  if (circle === circleId) return true;
  const a = circle.replace(/^0x/, "").toLowerCase();
  const b = circleId.replace(/^0x/, "").toLowerCase();
  return b.endsWith(a) || a.endsWith(b);
}

function eventTypeName(packageId: string, kind: "Created" | "Contributed" | "PaidOut"): string {
  return `${packageId}::circle::${kind}`;
}

function kindFromType(typeStr: string): KoloEventKind | null {
  if (typeStr.endsWith("::Created")) return "created";
  if (typeStr.endsWith("::Contributed")) return "contributed";
  if (typeStr.endsWith("::PaidOut")) return "paid_out";
  return null;
}

/**
 * Kolo timing rule (not on-chain — the contract has no due date).
 * A contribution is on_time if its timestamp is strictly before the round's
 * completing contribution; the completing contribution (round_complete=true)
 * is last; anything after that completing timestamp is late.
 */
export function classifyTiming(args: {
  event: Pick<KoloEvent, "kind" | "round" | "timestampMs" | "roundComplete">;
  roundCompleteAt: Map<number, number>;
}): TimingClass | undefined {
  if (args.event.kind !== "contributed") return undefined;
  if (args.event.roundComplete) return "last";
  const completeAt = args.roundCompleteAt.get(args.event.round);
  if (completeAt === undefined) return "on_time"; // round still open
  if (args.event.timestampMs < completeAt) return "on_time";
  if (args.event.timestampMs === completeAt) return "last";
  return "late";
}

function buildRoundCompleteMap(events: KoloEvent[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const ev of events) {
    if (ev.kind === "contributed" && ev.roundComplete) {
      const prev = map.get(ev.round);
      if (prev === undefined || ev.timestampMs < prev) {
        map.set(ev.round, ev.timestampMs);
      }
    }
  }
  return map;
}

type GqlEventNode = {
  timestamp?: string | null;
  contents?: { json?: unknown };
  transaction?: {
    digest?: string;
    effects?: { checkpoint?: { sequenceNumber?: string | number } };
  };
  transactionModule?: {
    name?: string;
    package?: { address?: string };
  };
};

function parseGqlNode(
  node: GqlEventNode,
  eventType: string,
  circleId: string,
  coinType: string,
  via: TransportVia,
): KoloEvent | null {
  const kind = kindFromType(eventType);
  if (!kind) return null;
  const json = asRecord(node.contents?.json);
  if (!json) return null;
  const circle = String(json.circle ?? json.id ?? "");
  if (!circleMatches(circle, circleId)) return null;

  const digest = String(node.transaction?.digest ?? "");
  const checkpointRaw = node.transaction?.effects?.checkpoint?.sequenceNumber;
  const timestampMs = node.timestamp ? Date.parse(node.timestamp) : 0;

  if (kind === "created") {
    return {
      kind,
      circleId,
      round: 0,
      member: "",
      amountRaw: String(json.amount ?? "0"),
      coinType,
      decimals: DECIMALS_USDC,
      auto: Boolean(json.auto_payout),
      txDigest: digest,
      checkpoint: checkpointRaw !== undefined ? String(checkpointRaw) : null,
      timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
      explorerUrl: explorerTxUrl(digest),
      via,
    };
  }

  if (kind === "contributed") {
    return {
      kind,
      circleId,
      round: Number(json.round ?? 0),
      member: String(json.member ?? ""),
      amountRaw: String(json.amount ?? "0"),
      coinType,
      decimals: DECIMALS_USDC,
      roundComplete: Boolean(json.round_complete),
      txDigest: digest,
      checkpoint: checkpointRaw !== undefined ? String(checkpointRaw) : null,
      timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
      explorerUrl: explorerTxUrl(digest),
      via,
    };
  }

  return {
    kind: "paid_out",
    circleId,
    round: Number(json.round ?? 0),
    member: String(json.to ?? ""),
    amountRaw: String(json.amount ?? "0"),
    coinType,
    decimals: DECIMALS_USDC,
    auto: Boolean(json.auto),
    txDigest: digest,
    checkpoint: checkpointRaw !== undefined ? String(checkpointRaw) : null,
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
    explorerUrl: explorerTxUrl(digest),
    via,
  };
}

/** Parse recorded GraphQL events payload into KoloEvent[] (used by tests + live). */
export function parseGraphqlEventsPayload(
  payload: unknown,
  args: {
    circleId: string;
    eventType: string;
    coinType?: string;
    via?: TransportVia;
  },
): { events: KoloEvent[]; nextCursor: string | null } {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const eventsConn = asRecord(data?.events);
  const nodes = Array.isArray(eventsConn?.nodes) ? (eventsConn!.nodes as GqlEventNode[]) : [];
  const pageInfo = asRecord(eventsConn?.pageInfo);
  const nextCursor =
    pageInfo?.hasNextPage && typeof pageInfo.endCursor === "string" ? pageInfo.endCursor : null;
  const coinType = args.coinType ?? getCoinType();
  const via = args.via ?? "graphql";
  const events = nodes
    .map((n) => parseGqlNode(n, args.eventType, args.circleId, coinType, via))
    .filter((e): e is KoloEvent => e !== null);
  return { events, nextCursor };
}

const EVENTS_QUERY = `
query CircleEvents($type: String!, $after: String) {
  events(first: 50, after: $after, filter: { type: $type }) {
    pageInfo { hasNextPage endCursor }
    nodes {
      timestamp
      contents { json }
      transaction {
        digest
        effects { checkpoint { sequenceNumber } }
      }
      transactionModule { name package { address } }
    }
  }
}`;

async function fetchEventsOfType(args: {
  eventType: string;
  circleId: string;
  afterCursor?: string;
  coinType: string;
}): Promise<{ events: KoloEvent[]; nextCursor: string | null; via: TransportVia }> {
  const variables: Record<string, unknown> = { type: args.eventType };
  if (args.afterCursor) variables.after = args.afterCursor;

  const result = await withTatumFallback({
    graphql: async () => {
      const r = await tatumGraphql(EVENTS_QUERY, variables);
      return { data: r.data, via: "graphql" as const, ms: r.ms };
    },
    fullnode: async () => {
      const r = await fullnodeGraphql(EVENTS_QUERY, variables);
      return { data: r.data, via: "fullnode" as const, ms: r.ms };
    },
  });

  const parsed = parseGraphqlEventsPayload(result.data, {
    circleId: args.circleId,
    eventType: args.eventType,
    coinType: args.coinType,
    via: result.via,
  });
  return { ...parsed, via: result.via };
}

export async function getCircleEvents(
  circleId: string,
  opts?: { afterCursor?: string; packageId?: string; coinType?: string },
): Promise<{ events: KoloEvent[]; nextCursor: string | null; via: TransportVia }> {
  const packageId = opts?.packageId ?? getPackageId();
  if (!packageId) throw new Error("missing KOLO_PACKAGE_ID");
  const coinType = opts?.coinType ?? getCoinType();

  const kinds = ["Created", "Contributed", "PaidOut"] as const;
  const all: KoloEvent[] = [];
  let via: TransportVia = "graphql";
  let nextCursor: string | null = null;

  for (const kind of kinds) {
    const eventType = eventTypeName(packageId, kind);
    // afterCursor applies only to the first page of Contributed for sync; Created/PaidOut start fresh.
    const after =
      kind === "Contributed" || (!opts?.afterCursor && kind === "Created")
        ? opts?.afterCursor
        : undefined;
    const page = await fetchEventsOfType({
      eventType,
      circleId,
      afterCursor: after,
      coinType,
    });
    via = page.via;
    all.push(...page.events);
    if (kind === "Contributed" && page.nextCursor) nextCursor = page.nextCursor;
  }

  all.sort((a, b) => a.timestampMs - b.timestampMs || a.round - b.round);
  return { events: all, nextCursor, via };
}

const OBJECT_QUERY = `
query CircleObject($address: SuiAddress!) {
  object(address: $address) {
    address
    digest
    asMoveObject {
      contents { json }
    }
  }
}`;

function objectFromGraphql(payload: unknown): unknown {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const object = asRecord(data?.object);
  if (!object) throw new Error("circle object missing");
  const move = asRecord(object.asMoveObject);
  const contents = asRecord(move?.contents);
  const json = contents?.json ?? object;
  return { object: { json, digest: object.digest, objectId: object.address } };
}

export async function getCircleState(
  circleId: string,
  opts?: { packageId?: string; nameByAddress?: Record<string, string> },
): Promise<CircleView & { source: "live" | "saved"; priceAt?: string | null; priceNote?: string }> {
  const packageId = opts?.packageId ?? getPackageId() ?? "";
  const coinType = getCoinType();

  const objectResult = await withTatumFallback({
    graphql: async () => {
      const r = await tatumGraphql(OBJECT_QUERY, { address: circleId });
      return { data: objectFromGraphql(r.data), via: "graphql" as const, ms: r.ms };
    },
    grpc: async () => {
      const { data: client, ms } = await tatumGrpc();
      const object = await client.getObject({
        objectId: circleId,
        include: { json: true },
      });
      return { data: object, via: "grpc" as const, ms };
    },
    fullnode: async () => {
      const r = await fullnodeGraphql(OBJECT_QUERY, { address: circleId });
      return { data: objectFromGraphql(r.data), via: "fullnode" as const, ms: r.ms };
    },
  });

  let paidOut: PaidOutEvent[] = [];
  if (packageId) {
    try {
      const feed = await getCircleEvents(circleId, { packageId, coinType });
      paidOut = feed.events
        .filter((e) => e.kind === "paid_out")
        .map((e) => ({
          circle: e.circleId,
          to: e.member,
          round: e.round,
          amount: Number(e.amountRaw),
          auto: Boolean(e.auto),
          timestampMs: String(e.timestampMs),
          txDigest: e.txDigest,
        }));
    } catch {
      paidOut = [];
    }
  }

  const viaMap: Record<TransportVia, CircleView["via"]> = {
    graphql: "graphql",
    grpc: "grpc",
    jsonrpc: "graphql",
    fullnode: "graphql",
    saved: "saved",
  };

  const view = parseCircleState({
    id: circleId,
    object: objectResult.data,
    events: paidOut,
    nameByAddress: opts?.nameByAddress,
    via: viaMap[objectResult.via],
  });

  const priced = await fillPayoutNgn(view.payouts);
  return {
    ...view,
    payouts: priced.payouts,
    source: "live",
    priceAt: priced.priceAt,
    ...(priced.note ? { priceNote: priced.note } : {}),
  };
}

export type MemberBalance = {
  address: string;
  coinBalance: string;
  suiBalance: string;
  via: TransportVia;
};

const BALANCE_QUERY = `
query Balances($address: SuiAddress!, $coinType: String!) {
  address(address: $address) {
    coin: balance(coinType: $coinType) { totalBalance }
    sui: balance(coinType: "0x2::sui::SUI") { totalBalance }
  }
}`;

export async function getMemberBalances(
  addresses: string[],
  coinType?: string,
): Promise<MemberBalance[]> {
  const type = coinType ?? getCoinType();
  const out: MemberBalance[] = [];

  for (const address of addresses) {
    const result = await withTatumFallback({
      graphql: async () => {
        const r = await tatumGraphql(BALANCE_QUERY, { address, coinType: type });
        return { data: r.data, via: "graphql" as const, ms: r.ms };
      },
      grpc: async () => {
        const { data: client, ms } = await tatumGrpc();
        const coin = await client.getBalance({ owner: address, coinType: type });
        const sui = await client.getBalance({ owner: address, coinType: SUI_TYPE });
        return {
          data: {
            data: {
              address: {
                coin: { totalBalance: String(coin.balance?.balance ?? "0") },
                sui: { totalBalance: String(sui.balance?.balance ?? "0") },
              },
            },
          },
          via: "grpc" as const,
          ms,
        };
      },
      fullnode: async () => {
        const r = await fullnodeGraphql(BALANCE_QUERY, { address, coinType: type });
        return { data: r.data, via: "fullnode" as const, ms: r.ms };
      },
    });

    const root = asRecord(result.data);
    const data = asRecord(root?.data) ?? root;
    const addr = asRecord(data?.address);
    const coin = asRecord(addr?.coin);
    const sui = asRecord(addr?.sui);
    out.push({
      address,
      coinBalance: String(coin?.totalBalance ?? "0"),
      suiBalance: String(sui?.totalBalance ?? "0"),
      via: result.via,
    });
  }

  return out;
}

export async function getMemberHistory(
  address: string,
  circleId: string,
  opts?: { packageId?: string },
): Promise<MemberHistory> {
  const feed = await getCircleEvents(circleId, { packageId: opts?.packageId });
  const roundCompleteAt = buildRoundCompleteMap(feed.events);
  const mine = feed.events.filter(
    (e) =>
      e.member.toLowerCase() === address.toLowerCase() &&
      (e.kind === "contributed" || e.kind === "paid_out"),
  );
  const events: MemberHistoryItem[] = mine.map((e) => {
    const timing = classifyTiming({ event: e, roundCompleteAt });
    return timing ? { ...e, timing } : { ...e };
  });
  return {
    address,
    circleId,
    events,
    onTimeCount: events.filter((e) => e.timing === "on_time").length,
    lateCount: events.filter((e) => e.timing === "late").length,
    lastCount: events.filter((e) => e.timing === "last").length,
  };
}

function cursorPath(): string {
  return path.join(process.cwd(), "data/feed-cursor.json");
}

export function readFeedCursor(): FeedCursor {
  const file = cursorPath();
  if (!existsSync(file)) {
    return { cursor: null, lastCheckpoint: null, updatedAt: null };
  }
  return JSON.parse(readFileSync(file, "utf8")) as FeedCursor;
}

export function writeFeedCursor(next: FeedCursor): void {
  const dir = path.dirname(cursorPath());
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // Public fields only — never store keys.
  const safe: FeedCursor = {
    cursor: next.cursor,
    lastCheckpoint: next.lastCheckpoint,
    updatedAt: next.updatedAt ?? new Date().toISOString(),
  };
  writeFileSync(cursorPath(), `${JSON.stringify(safe, null, 2)}\n`, "utf8");
}

export function hasLiveTatumEnv(): boolean {
  return Boolean(tatumApiKey());
}

export { DECIMALS_USDC, DECIMALS_SUI, SUI_TYPE, buildRoundCompleteMap };
