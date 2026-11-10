import { getPackageId, tatumApiKey } from "@/lib/config";
import { readSavedDemoState } from "@/lib/demo-state";
import { getMemberHistory, hasLiveTatumEnv } from "@/lib/feed";
import { redact } from "@/lib/redact";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;
  const url = new URL(request.url);
  const circle = url.searchParams.get("circle") || readSavedDemoState().circleId || "";
  const saved = readSavedDemoState();

  if (!hasLiveTatumEnv() || !tatumApiKey() || !circle) {
    const body = JSON.stringify({
      address,
      circleId: circle || "saved",
      events: [],
      onTimeCount: 0,
      lateCount: 0,
      lastCount: 0,
      source: "saved",
    });
    return new Response(redact(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const history = await getMemberHistory(address, circle, {
      packageId: getPackageId() || saved.packageId || undefined,
    });
    const body = JSON.stringify({ ...history, source: "live" });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    const body = JSON.stringify({
      address,
      circleId: circle,
      events: [],
      onTimeCount: 0,
      lateCount: 0,
      lastCount: 0,
      source: "saved",
    });
    return new Response(redact(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
