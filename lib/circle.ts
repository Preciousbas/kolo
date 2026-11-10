import "server-only";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getCoinType, getPackageId, tatumApiKey } from "./config";
import {
  createPublicGraphql,
  createTatumGraphql,
  getGraphqlClient,
  getGrpcClient,
  type SuiVia,
} from "./sui-client";

export type PayoutMode = "auto" | "manual";
export type MemberBadge = "scheduled" | "paid" | "skipped";

export type Payout = {
  round: number;
  recipient: string;
  amountUsd: number;
  amountNgn: number | null;
  paidAt: string | null;
  txRef: string;
  mode: PayoutMode;
};

export type CircleMemberView = {
  address: string;
  name?: string;
  paidThisRound: boolean;
  badge: MemberBadge;
};

export type CircleView = {
  id: string;
  round: number;
  rounds: number;
  amount: number;
  amountUsd: number;
  potValue: number;
  potUsd: number;
  recipient: string;
  autoPayout: boolean;
  isFinished: boolean;
  members: CircleMemberView[];
  paid: boolean[];
  payouts: Payout[];
  via: "tatum" | "grpc" | "graphql" | "saved";
  sourceNote?: string;
};

export type PaidOutEvent = {
  circle: string;
  to: string;
  round: number;
  amount: number;
  auto: boolean;
  timestampMs?: string | null;
  txDigest?: string | null;
};

export type CircleObjectFields = {
  members: string[];
  amount: string | number;
  round: string | number;
  paid: boolean[];
  paid_out?: boolean[];
  auto_payout?: boolean;
  creator?: string;
  pot?: { fields?: { balance?: string | number }; balance?: string | number };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function usdcFromBase(base: number, decimals = 6): number {
  return base / 10 ** decimals;
}

export type CircleMoveFn = "create" | "contribute" | "payout" | "open" | "join" | "start";

export function packageTarget(fn: CircleMoveFn, packageId?: string): string {
  const id = packageId ?? getPackageId();
  if (!id) throw new Error("missing KOLO_PACKAGE_ID");
  return `${id}::circle::${fn}`;
}

export function buildCreateTx(args: {
  members: string[];
  amount: number;
  autoPayout: boolean;
  coinType?: string;
  packageId?: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("create", args.packageId),
    typeArguments: [args.coinType ?? getCoinType()],
    arguments: [
      tx.pure.vector("address", args.members),
      tx.pure.u64(args.amount),
      tx.pure.bool(args.autoPayout),
    ],
  });
  return tx;
}

export function buildOpenTx(args: {
  maxMembers: number;
  amount: number;
  autoPayout: boolean;
  coinType?: string;
  packageId?: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("open", args.packageId),
    typeArguments: [args.coinType ?? getCoinType()],
    arguments: [
      tx.pure.u64(args.maxMembers),
      tx.pure.u64(args.amount),
      tx.pure.bool(args.autoPayout),
    ],
  });
  return tx;
}

export function buildJoinTx(args: {
  circleId: string;
  coinType?: string;
  packageId?: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("join", args.packageId),
    typeArguments: [args.coinType ?? getCoinType()],
    arguments: [tx.object(args.circleId)],
  });
  return tx;
}

export function buildStartTx(args: {
  circleId: string;
  coinType?: string;
  packageId?: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("start", args.packageId),
    typeArguments: [args.coinType ?? getCoinType()],
    arguments: [tx.object(args.circleId)],
  });
  return tx;
}

export function buildContributeTx(args: {
  circleId: string;
  coinId: string;
  coinType?: string;
  packageId?: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("contribute", args.packageId),
    typeArguments: [args.coinType ?? getCoinType()],
    arguments: [tx.object(args.circleId), tx.object(args.coinId)],
  });
  return tx;
}

export function buildPayoutTx(args: {
  circleId: string;
  coinType?: string;
  packageId?: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("payout", args.packageId),
    typeArguments: [args.coinType ?? getCoinType()],
    arguments: [tx.object(args.circleId)],
  });
  return tx;
}

/** Derive demo wallets 0..5 from KOLO_SEED_MNEMONIC. Never log key material. */
export function getDemoKeypairs(mnemonic?: string): Ed25519Keypair[] {
  const phrase = mnemonic ?? process.env.KOLO_SEED_MNEMONIC;
  if (!phrase) throw new Error("missing KOLO_SEED_MNEMONIC");
  const out: Ed25519Keypair[] = [];
  for (let i = 0; i <= 5; i += 1) {
    out.push(Ed25519Keypair.deriveKeypair(phrase, `m/44'/784'/0'/0'/${i}'`));
  }
  return out;
}

export function getDemoAddresses(mnemonic?: string): string[] {
  return getDemoKeypairs(mnemonic).map((k) => k.getPublicKey().toSuiAddress());
}

function extractFields(raw: unknown): CircleObjectFields | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  const object = asRecord(data?.object) ?? data;
  const content = asRecord(object?.content);
  const json = asRecord(object?.json) ?? asRecord(data?.json) ?? asRecord(root?.json);
  const fields =
    asRecord(content?.fields) ??
    asRecord(object?.fields) ??
    asRecord(data?.fields) ??
    json;
  if (!fields) return null;
  const membersRaw = fields.members;
  const paidRaw = fields.paid;
  if (!Array.isArray(membersRaw) || !Array.isArray(paidRaw)) return null;
  return {
    members: membersRaw.map(String),
    amount: (fields.amount as string | number) ?? 0,
    round: (fields.round as string | number) ?? 0,
    paid: paidRaw.map(Boolean),
    paid_out: Array.isArray(fields.paid_out) ? fields.paid_out.map(Boolean) : undefined,
    auto_payout: Boolean(fields.auto_payout),
    creator: fields.creator ? String(fields.creator) : undefined,
    pot: asRecord(fields.pot) as CircleObjectFields["pot"],
  };
}

function potBalance(fields: CircleObjectFields): number {
  const pot = fields.pot;
  if (!pot) return 0;
  if (pot.balance !== undefined) return toNumber(pot.balance);
  return toNumber(pot.fields?.balance);
}

export function parsePaidOutEvents(events: PaidOutEvent[]): Payout[] {
  return events
    .slice()
    .sort((a, b) => a.round - b.round)
    .map((ev) => ({
      round: ev.round + 1,
      recipient: ev.to,
      amountUsd: usdcFromBase(ev.amount),
      amountNgn: null,
      paidAt: ev.timestampMs ? new Date(Number(ev.timestampMs)).toISOString() : null,
      txRef: ev.txDigest ?? `round-${ev.round}`,
      mode: ev.auto ? "auto" : "manual",
    }));
}

export function parseCircleState(args: {
  id: string;
  object: unknown;
  events?: PaidOutEvent[];
  nameByAddress?: Record<string, string>;
  via: CircleView["via"];
  sourceNote?: string;
}): CircleView {
  const fields = extractFields(args.object);
  if (!fields) throw new Error("circle object fields missing");

  const roundIdx = toNumber(fields.round);
  const amount = toNumber(fields.amount);
  const members = fields.members;
  const paid = fields.paid;
  const paidOut = fields.paid_out ?? members.map(() => false);
  const potValue = potBalance(fields);
  const events = args.events ?? [];
  const payouts = parsePaidOutEvents(events);

  const memberViews: CircleMemberView[] = members.map((address, i) => {
    let badge: MemberBadge = "scheduled";
    if (paidOut[i] || payouts.some((p) => p.recipient === address && p.round === i + 1)) {
      badge = "paid";
    }
    return {
      address,
      name: args.nameByAddress?.[address],
      paidThisRound: Boolean(paid[i]),
      badge,
    };
  });

  return {
    id: args.id,
    round: roundIdx + 1,
    rounds: members.length,
    amount,
    amountUsd: usdcFromBase(amount),
    potValue,
    potUsd: usdcFromBase(potValue),
    recipient: members[roundIdx] ?? "",
    autoPayout: Boolean(fields.auto_payout),
    isFinished: roundIdx >= members.length,
    members: memberViews,
    paid,
    payouts,
    via: args.via,
    sourceNote: args.sourceNote,
  };
}

function circleMatches(circle: string, circleId: string): boolean {
  if (!circle) return true;
  if (circle === circleId) return true;
  const a = circle.replace(/^0x/, "");
  const b = circleId.replace(/^0x/, "");
  return circleId.endsWith(a) || circle.endsWith(b);
}

function normalizeEventEntries(entries: unknown[], circleId: string): PaidOutEvent[] {
  const out: PaidOutEvent[] = [];
  for (const item of entries) {
    const ev = asRecord(item);
    if (!ev) continue;
    const parsed =
      asRecord(ev.json) ??
      asRecord(ev.parsedJson) ??
      asRecord(asRecord(ev.event)?.parsedJson);
    if (!parsed) continue;
    const circle = String(parsed.circle ?? "");
    if (!circleMatches(circle, circleId)) continue;
    out.push({
      circle: String(parsed.circle ?? circleId),
      to: String(parsed.to ?? ""),
      round: toNumber(parsed.round as string | number),
      amount: toNumber(parsed.amount as string | number),
      auto: Boolean(parsed.auto),
      timestampMs: ev.timestampMs ? String(ev.timestampMs) : null,
      txDigest: ev.transactionDigest
        ? String(ev.transactionDigest)
        : ev.id && asRecord(ev.id)?.txDigest
          ? String(asRecord(ev.id)?.txDigest)
          : null,
    });
  }
  return out;
}

async function fetchObject(
  client: { getObject: (input: { objectId: string; include?: { json?: boolean } }) => Promise<unknown> },
  id: string,
): Promise<unknown> {
  return client.getObject({
    objectId: id,
    include: { json: true },
  });
}

async function fetchPaidOutEvents(
  client: {
    listEvents: (input: {
      filter: { eventType: string };
      limit: number;
      order: "ascending" | "descending";
    }) => Promise<{ events?: unknown[] }>;
  },
  circleId: string,
  packageId: string,
): Promise<PaidOutEvent[]> {
  const result = await client.listEvents({
    filter: { eventType: `${packageId}::circle::PaidOut` },
    limit: 50,
    order: "ascending",
  });
  return normalizeEventEntries(result.events ?? [], circleId);
}

async function readObjectWithFallback(id: string): Promise<{ object: unknown; via: SuiVia }> {
  // gRPC first (Tatum when keyed, else public), then GraphQL fallback.
  try {
    const { client, via } = await getGrpcClient();
    const object = await fetchObject(client, id);
    return { object, via };
  } catch {
    // GraphQL fallback for object reads gRPC lacks or fails on.
  }
  // UNCONFIRMED: Tatum GraphQL getObject coverage.
  if (tatumApiKey()) {
    try {
      const object = await fetchObject(createTatumGraphql(), id);
      return { object, via: "tatum" };
    } catch {
      // public GraphQL
    }
  }
  const object = await fetchObject(createPublicGraphql(), id);
  return { object, via: "graphql" };
}

async function readEventsWithFallback(
  circleId: string,
  packageId: string,
): Promise<{ events: PaidOutEvent[]; via: SuiVia }> {
  // Prefer gRPC; GraphQL fallback for payout history.
  try {
    const { client, via } = await getGrpcClient();
    const events = await fetchPaidOutEvents(client, circleId, packageId);
    return { events, via };
  } catch {
    // continue to GraphQL
  }
  try {
    const { client, via } = await getGraphqlClient();
    const events = await fetchPaidOutEvents(client, circleId, packageId);
    return { events, via };
  } catch {
    const events = await fetchPaidOutEvents(createPublicGraphql(), circleId, packageId);
    return { events, via: "graphql" };
  }
}

export async function readCircle(args: {
  id: string;
  packageId?: string;
  nameByAddress?: Record<string, string>;
}): Promise<CircleView> {
  const packageId = args.packageId ?? getPackageId() ?? "";
  const { object, via } = await readObjectWithFallback(args.id);
  let events: PaidOutEvent[] = [];
  let eventVia: SuiVia = via;
  if (packageId) {
    try {
      const listed = await readEventsWithFallback(args.id, packageId);
      events = listed.events;
      eventVia = listed.via;
    } catch {
      events = [];
    }
  }

  return parseCircleState({
    id: args.id,
    object,
    events,
    nameByAddress: args.nameByAddress,
    // Prefer object transport; surface graphql when only events used that path.
    via: via === "graphql" || eventVia === "graphql" ? (via === "grpc" ? "graphql" : via) : via,
  });
}

export { usdcFromBase };
