import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  buildRoundCompleteMap,
  classifyTiming,
  type KoloEvent,
} from "./feed";

export type KoloMemory = {
  v: 1;
  app: "kolo";
  kind: "paid" | "paid_out";
  circleId: string;
  round: number;
  member: string;
  timing: "on_time" | "late" | null;
  amountRaw: string;
  coinType: string;
  decimals: number;
  at: string;
  txDigest: string;
  escrowNetwork: "testnet";
};

const KoloMemorySchema = z.object({
  v: z.literal(1),
  app: z.literal("kolo"),
  kind: z.enum(["paid", "paid_out"]),
  circleId: z.string().min(1),
  round: z.number().int().nonnegative(),
  member: z.string().regex(/^0x[0-9a-fA-F]+$/, "member must be a Sui address"),
  timing: z.enum(["on_time", "late"]).nullable(),
  amountRaw: z.string(),
  coinType: z.string().min(1),
  decimals: z.number().int().nonnegative(),
  at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  txDigest: z.string().min(1),
  escrowNetwork: z.literal("testnet"),
});

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Require separators / + so hex addresses and amountRaw digit runs do not match.
const PHONE_RE =
  /(?:\+\d{1,3}[\s.-]?\d{2,}|\(\d{2,4}\)[\s.-]?\d{3,}|\d{3}[\s.-]\d{3}[\s.-]\d{4})/;

function demoNames(): string[] {
  const file = path.join(process.cwd(), "data/demo-circle.json");
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as {
      members?: Array<{ name?: string }>;
    };
    return (raw.members ?? [])
      .map((m) => (m.name || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Short address form for human-readable memory text (never a personal name). */
export function shortAddress(address: string): string {
  const h = address.replace(/^0x/i, "");
  if (h.length <= 4) return `0x${h}`;
  return `0x${h.slice(0, 2)}..${h.slice(-2)}`;
}

export function memoryNamespace(circleId: string): string {
  return `kolo:${circleId}`;
}

function mapTiming(
  event: KoloEvent,
  roundCompleteAt: Map<number, number>,
): "on_time" | "late" | null {
  if (event.kind === "paid_out") return null;
  if (event.kind !== "contributed") return null;
  const timing = classifyTiming({ event, roundCompleteAt });
  if (timing === "late") return "late";
  // on_time and last (round-completing contribution) both count as on_time for memory.
  return "on_time";
}

export function assertNoPii(text: string): void {
  if (EMAIL_RE.test(text)) {
    throw new Error("memory rejected: email pattern");
  }
  if (PHONE_RE.test(text)) {
    throw new Error("memory rejected: phone pattern");
  }
  const lower = text.toLowerCase();
  for (const name of demoNames()) {
    const token = name.replace(/\s*\(you\)\s*/i, "").trim();
    if (!token) continue;
    if (lower.includes(token.toLowerCase())) {
      throw new Error(`memory rejected: contains demo name ${token}`);
    }
  }
}

export function toMemory(
  event: KoloEvent,
  allEvents?: KoloEvent[],
): { memory: KoloMemory; text: string; namespace: string } {
  if (event.kind === "created") {
    throw new Error("memory rejected: created events are not stored");
  }
  if (event.kind !== "contributed" && event.kind !== "paid_out") {
    throw new Error("memory rejected: unsupported event kind");
  }

  const roundCompleteAt = buildRoundCompleteMap(allEvents ?? [event]);
  const kind: KoloMemory["kind"] = event.kind === "contributed" ? "paid" : "paid_out";
  const timing = mapTiming(event, roundCompleteAt);
  const at = new Date(event.timestampMs || Date.now()).toISOString();

  const memory: KoloMemory = {
    v: 1,
    app: "kolo",
    kind,
    circleId: event.circleId,
    round: event.round,
    member: event.member,
    timing,
    amountRaw: event.amountRaw,
    coinType: event.coinType,
    decimals: event.decimals,
    at,
    txDigest: event.txDigest,
    escrowNetwork: "testnet",
  };

  const parsed = KoloMemorySchema.safeParse(memory);
  if (!parsed.success) {
    throw new Error(`memory rejected: invalid record (${parsed.error.message})`);
  }

  const memberShort = shortAddress(memory.member);
  const circleShort = shortAddress(memory.circleId);
  const sentence =
    kind === "paid"
      ? `Kolo: member ${memberShort} paid round ${memory.round} of circle ${circleShort}${
          timing === "late" ? " late" : " on time"
        }.`
      : `Kolo: member ${memberShort} paid out round ${memory.round} of circle ${circleShort}.`;

  const text = `${sentence} ${JSON.stringify(memory)}`;
  assertNoPii(text);

  return {
    memory,
    text,
    namespace: memoryNamespace(memory.circleId),
  };
}

/** Parse a KoloMemory JSON object out of a recall hit text. */
export function parseMemoryFromText(text: string): KoloMemory | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as unknown;
    const parsed = KoloMemorySchema.safeParse(raw);
    return parsed.success ? (parsed.data as KoloMemory) : null;
  } catch {
    return null;
  }
}
