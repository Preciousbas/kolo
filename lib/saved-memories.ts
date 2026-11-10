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

export function filterSavedMemoriesForMember(
  memories: SavedMainnetMemory[],
  circleId: string,
  member: string,
): SavedMainnetMemory[] {
  const norm = (a: string) => a.replace(/^0x/i, "").toLowerCase();
  const circle = norm(circleId);
  const who = norm(member);
  return memories.filter(
    (m) =>
      norm(m.member) === who &&
      (norm(m.circleId) === circle || m.circleId === circleId),
  );
}
