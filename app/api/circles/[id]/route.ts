import { isDemoCircleId } from "@/lib/circle-access";
import { getStoredCircle, isCircleMember, memberDisplayNames } from "@/lib/circle-registry";
import { getPackageId, tatumApiKey } from "@/lib/config";
import {
  demoNameByAddress,
  readSavedDemoState,
  savedStateAsCircleView,
} from "@/lib/demo-state";
import { getCircleState, getMemberBalances, hasLiveTatumEnv } from "@/lib/feed";
import { redact } from "@/lib/redact";
import { getRequestSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const demo = isDemoCircleId(id);
  if (!demo) {
    const session = await getRequestSession();
    const stored = await getStoredCircle(id);
    if (!session || !stored || !isCircleMember(stored, session.address)) {
      return Response.json({ error: "not your circle" }, { status: 404 });
    }
    const names = await memberDisplayNames(stored);
    return Response.json({
      id: stored.id,
      name: stored.name,
      members: stored.members.map((address) => ({
        address,
        displayName: names[address] ?? names[address.toLowerCase()] ?? null,
      })),
      memberCount: stored.members.length,
      maxMembers: stored.maxMembers,
      started: stored.started,
      amount: stored.amount,
      creator: stored.creator,
    });
  }

  const saved = readSavedDemoState();
  const names = demoNameByAddress(saved);

  if (!hasLiveTatumEnv() || !tatumApiKey()) {
    const fallback = savedStateAsCircleView(saved);
    const body = JSON.stringify({
      ...fallback,
      name: saved.name,
      id: id || fallback.id,
      balances: [],
      source: "saved",
    });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  }

  try {
    const view = await getCircleState(id, {
      packageId: getPackageId() || saved.packageId || undefined,
      nameByAddress: names,
    });
    const addresses = view.members.map((m) => m.address).filter(Boolean);
    let balances: unknown[] = [];
    try {
      balances = await getMemberBalances(addresses, saved.coinType || undefined);
    } catch {
      balances = [];
    }
    const body = JSON.stringify({
      ...view,
      name: saved.name,
      balances,
      source: view.source ?? "live",
    });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    const fallback = savedStateAsCircleView(saved);
    const body = JSON.stringify({
      ...fallback,
      name: saved.name,
      id: id || fallback.id,
      balances: [],
      source: "saved",
    });
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  }
}
