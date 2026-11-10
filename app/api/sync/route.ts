import { getPackageId } from "@/lib/config";
import { readSavedDemoState, resolveDemoCircleId } from "@/lib/demo-state";
import { syncMemories } from "@/lib/memory-sync";
import { redact } from "@/lib/redact";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    const body = JSON.stringify({ error: "unauthorized" });
    return new Response(redact(body), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(request.url);
  let circleId = url.searchParams.get("circle") || "";
  if (!circleId) {
    try {
      const raw = (await request.json()) as { circleId?: string };
      circleId = raw.circleId || "";
    } catch {
      circleId = "";
    }
  }
  if (!circleId) circleId = resolveDemoCircleId();
  if (!circleId) {
    const body = JSON.stringify({ error: "missing circleId" });
    return new Response(redact(body), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const saved = readSavedDemoState();
    const result = await syncMemories(circleId, {
      packageId: getPackageId() || saved.packageId || undefined,
    });
    const summary = result.mock
      ? `memory: mock`
      : `memory: ${result.written} written`;
    const body = JSON.stringify({
      ok: true,
      circleId,
      summary,
      written: result.written,
      skipped: result.skipped,
      rateLimited: result.rateLimited,
      network: result.network,
      mock: result.mock,
    });
    return new Response(redact(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync failed";
    const body = JSON.stringify({ error: message });
    return new Response(redact(body), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function GET() {
  const body = JSON.stringify({ error: "POST only" });
  return new Response(redact(body), {
    status: 405,
    headers: { "content-type": "application/json", allow: "POST" },
  });
}
