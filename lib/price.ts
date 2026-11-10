import "server-only";
import { price as tatumPrice } from "./tatum";

const PRICE_CACHE_MS = 5 * 60 * 1000;

export type NairaPrice = {
  symbol: string;
  ngnPerUnit: number | null;
  usdAmount: number;
  amountNgn: number | null;
  priceAt: string | null;
  note?: string;
};

type CacheEntry = {
  expires: number;
  value: number | null;
  priceAt: string | null;
};

const cache = new Map<string, CacheEntry>();

export function clearPriceCache(): void {
  cache.clear();
}

async function cachedRate(symbol: string): Promise<{ rate: number | null; priceAt: string | null }> {
  const key = `${symbol}:NGN`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) {
    return { rate: hit.value, priceAt: hit.priceAt };
  }
  const quote = await tatumPrice(symbol, "NGN");
  const rate = quote.value !== null && Number.isFinite(Number(quote.value)) ? Number(quote.value) : null;
  const priceAt = quote.timestamp ?? (rate !== null ? new Date().toISOString() : null);
  cache.set(key, { expires: Date.now() + PRICE_CACHE_MS, value: rate, priceAt });
  return { rate, priceAt };
}

/**
 * Convert a USD-pegged amount to naira via Tatum price API.
 * Prefer USDC→NGN; if that fails, return USD only with a note.
 */
export async function toNaira(usdAmount: number, symbol = "USDC"): Promise<NairaPrice> {
  const { rate, priceAt } = await cachedRate(symbol);
  if (rate === null) {
    return {
      symbol,
      ngnPerUnit: null,
      usdAmount,
      amountNgn: null,
      priceAt: null,
      note: "naira price unavailable",
    };
  }
  return {
    symbol,
    ngnPerUnit: rate,
    usdAmount,
    amountNgn: Math.round(usdAmount * rate * 100) / 100,
    priceAt,
  };
}

/** Fill amountNgn on payout-shaped objects. */
export async function fillPayoutNgn<T extends { amountUsd: number; amountNgn: number | null }>(
  payouts: T[],
): Promise<{ payouts: T[]; priceAt: string | null; note?: string }> {
  if (payouts.length === 0) {
    return { payouts, priceAt: null };
  }
  const sample = await toNaira(payouts[0].amountUsd);
  const filled = payouts.map((p) => ({
    ...p,
    amountNgn:
      sample.ngnPerUnit === null
        ? null
        : Math.round(p.amountUsd * sample.ngnPerUnit * 100) / 100,
  }));
  return {
    payouts: filled,
    priceAt: sample.priceAt,
    ...(sample.note ? { note: sample.note } : {}),
  };
}
