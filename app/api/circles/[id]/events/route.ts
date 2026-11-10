import { getPackageId, tatumApiKey } from "@/lib/config";
import { readSavedDemoState } from "@/lib/demo-state";
import { getCircleEvents, hasLiveTatumEnv, readFeedCursor, writeFeedCursor } from "@/lib/feed";
import { redact } from "@/lib/redact";
import type { KoloEvent } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const revalidate = 15;

function savedEvents(): KoloEvent[] {
  const saved = readSavedDemoState();
  const out: KoloEvent[] = [];
  for (const p of saved.payouts) {
    out.push({
      kind: "paid_out",
      circleId: saved.circleId || "saved",
      round: Math.max(0, p.round - 1),
      member: p.recipient,
      amountRaw: String(Math.round(p.amountUsd * 1_000_000)),
      coinType: saved.coinType,
      decimals: 6,
      auto: p.mode === "auto",
      txDigest: p.txRef || "",
      checkpoint: null,
      timestampMs: p.paidAt ? Date.parse(p.paidAt) : 0,
      explorerUrl: p.txRef ? `https://suiscan.xyz/testnet/tx/${p.txRef}` : "",
      via: "graphql",
    });
  }
  return out;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const afterCursor = url.searchParams.get("after") ?? undefined;
  const saved = readSavedDemoState();

  if (!hasLiveTatumEnv() || !tatumApiKey()) {
    const body = JSON.stringify({
      events: savedEvents(),
      nextCursor: null,
      source: "saved",
    });
    return new Response(redact(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const result = await getCircleEvents(id, {
      afterCursor,
      packageId: getPackageId() || saved.packageId || undefined,
      coinType: saved.coinType || undefined,
    });
    const lastCheckpoint =
      result.events
        .map((e) => e.checkpoint)
        .filter((c): c is string => Boolean(c))
        .at(-1) ?? null;
    writeFeedCursor({
      cursor: result.nextCursor,
      lastCheckpoint,
      updatedAt: new Date().toISOString(),
    });
    const stored = readFeedCursor();
    const body = JSON.stringify({
      events: result.events,
      nextCursor: result.nextCursor,
      via: result.via,
      cursor: stored,
      source: "live",
    });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    const body = JSON.stringify({
      events: savedEvents(),
      nextCursor: null,
      source: "saved",
    });
    return new Response(redact(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
