/**
 * Round pot helpers. Pot this round is derived from the same paid flags /
 * current-round contribution events that drive "Who has paid" — never hardcoded.
 */

export type RoundPaymentEvent = {
  kind: string;
  round: number;
  amountRaw: string;
};

export type RoundPot = {
  potUsd: number;
  targetUsd: number;
  paidCount: number;
  memberCount: number;
};

const USDC_DECIMALS = 6;

function usdcFromRaw(amountRaw: string): number {
  const n = Number(amountRaw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n / 10 ** USDC_DECIMALS;
}

/**
 * Compute the current-round pot.
 * - Prefer summing contribution events for `round` (1-indexed, matching UI).
 * - Otherwise paidCount × contributionUsd from the same `paid` flags as "Who has paid".
 * - Target is always contribution × member count.
 */
export function computeRoundPot(args: {
  paid: boolean[];
  contributionUsd: number;
  /** UI round (1-indexed). Must match event.round after feed normalization. */
  round?: number;
  events?: RoundPaymentEvent[];
}): RoundPot {
  const memberCount = args.paid.length;
  const paidCount = args.paid.filter(Boolean).length;
  const contributionUsd = Number.isFinite(args.contributionUsd) ? Math.max(0, args.contributionUsd) : 0;
  const targetUsd = contributionUsd * memberCount;

  let potUsd = paidCount * contributionUsd;

  if (args.events && args.round !== undefined && Number.isFinite(args.round)) {
    const contribs = args.events.filter(
      (e) => e.kind === "contributed" && e.round === args.round,
    );
    if (contribs.length > 0) {
      potUsd = contribs.reduce((sum, e) => sum + usdcFromRaw(e.amountRaw), 0);
    }
  }

  return {
    potUsd: Math.round(potUsd * 100) / 100,
    targetUsd: Math.round(targetUsd * 100) / 100,
    paidCount,
    memberCount,
  };
}
