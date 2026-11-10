import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type SavedMainnetMemory = {
  key: string;
  circleId: string;
  round: number;
  member: string;
  kind: "paid" | "paid_out";
  timing: "on_time" | "late" | null;
  txDigest: string;
  blobId: string;
  memoryId: string;
  network: "mainnet";
  writtenAt: string;
  points: number;
  link: string;
};

export type SavedMainnetIndex = {
  network: "mainnet";
  escrowNetwork: "testnet";
  circleId: string;
  count: number;
  memories: SavedMainnetMemory[];
};

const SAVED_INDEX_PATH = "data/memories.mainnet.json";

export function savedMainnetIndexPath(): string {
  return path.join(process.cwd(), SAVED_INDEX_PATH);
}

/** Committed mainnet memory export used when live MemWal recall fails. */
export function readSavedMainnetMemories(): SavedMainnetMemory[] {
  const file = savedMainnetIndexPath();
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<SavedMainnetIndex>;
    if (!Array.isArray(raw.memories)) return [];
    return raw.memories.filter(
      (m): m is SavedMainnetMemory =>
        Boolean(m) &&
        typeof m.member === "string" &&
        typeof m.circleId === "string" &&
        typeof m.blobId === "string" &&
        typeof m.txDigest === "string" &&
        (m.kind === "paid" || m.kind === "paid_out"),
    );
  } catch {
    return [];
  }
}

function normAddr(a: string): string {
  return a.replace(/^0x/i, "").toLowerCase();
}

export function filterSavedMemoriesForMember(
  memories: SavedMainnetMemory[],
  circleId: string,
  member: string,
): SavedMainnetMemory[] {
  const circle = normAddr(circleId);
  const who = normAddr(member);
  return memories.filter(
    (m) =>
      normAddr(m.member) === who &&
      (normAddr(m.circleId) === circle || m.circleId === circleId),
  );
}

/** All saved mainnet memories for a wallet across every circle. */
export function filterSavedMemoriesForAddress(
  memories: SavedMainnetMemory[],
  member: string,
): SavedMainnetMemory[] {
  const who = normAddr(member);
  return memories.filter((m) => normAddr(m.member) === who);
}
