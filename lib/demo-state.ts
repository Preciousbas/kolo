import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CircleView } from "./circle";
import { getDemoCircleId, getPackageId } from "./config";

export type SavedDemoState = {
  circleId: string;
  packageId: string;
  name: string;
  network: string;
  coinType: string;
  contributionUsd: number;
  autoPayout: boolean;
  round: number;
  paidCount: number;
  memberCount: number;
  recipientName: string;
  members: { name: string; address: string; index: number }[];
  paidThisRound: boolean[];
  payouts: {
    round: number;
    recipient: string;
    amountUsd: number;
    amountNgn: number | null;
    paidAt: string | null;
    txRef: string;
    mode: "auto" | "manual";
  }[];
  digests: string[];
  updatedAt: string | null;
  note?: string;
};

export function readSavedDemoState(): SavedDemoState {
  const file = path.join(process.cwd(), "data/demo-state.json");
  return JSON.parse(readFileSync(file, "utf8")) as SavedDemoState;
}

export function resolveDemoCircleId(): string {
  return getDemoCircleId() || readSavedDemoState().circleId || "";
}

export function savedStateAsCircleView(state: SavedDemoState): CircleView {
  const amountBase = (state.contributionUsd || 20) * 1_000_000;
  const paidCount = state.paidCount ?? state.paidThisRound.filter(Boolean).length;
  return {
    id: state.circleId || "saved",
    round: state.round,
    rounds: state.memberCount,
    amount: amountBase,
    amountUsd: state.contributionUsd,
    potValue: paidCount * amountBase,
    potUsd: paidCount * state.contributionUsd,
    recipient:
      state.members.find((m) => m.name === state.recipientName)?.address ||
      state.recipientName,
    autoPayout: state.autoPayout,
    isFinished: state.round > state.memberCount,
    members: state.members.map((m, i) => ({
      address: m.address || `member-${i}`,
      name: m.name,
      paidThisRound: Boolean(state.paidThisRound[i]),
      badge: (state.payouts.some((p) => p.recipient === m.name || p.recipient === m.address)
        ? "paid"
        : "scheduled") as "paid" | "scheduled" | "skipped",
    })),
    paid: state.paidThisRound,
    payouts: state.payouts.map((p) => ({
      ...p,
      recipient:
        state.members.find((m) => m.name === p.recipient)?.address || p.recipient,
    })),
    via: "saved",
    sourceNote: "showing saved state",
  };
}

export function demoNameByAddress(state: SavedDemoState): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of state.members) {
    if (m.address) map[m.address] = m.name;
  }
  return map;
}

export function escrowHealth() {
  return {
    packageId: getPackageId() ? "set" : "missing",
    demoCircle: resolveDemoCircleId() ? "set" : "missing",
  };
}
