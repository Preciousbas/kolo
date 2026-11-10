import { getPackageId } from "@/lib/config";
import { demoNameByAddress, readSavedDemoState, resolveDemoCircleId } from "@/lib/demo-state";
import { getMemberTrust } from "@/lib/member-trust";
import { redact } from "@/lib/redact";

export const dynamic = "force-dynamic";
export const revalidate = 15;

export async function GET(
  request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;
  const url = new URL(request.url);
  const saved = readSavedDemoState();
  const circle =
    url.searchParams.get("circle") || resolveDemoCircleId() || saved.circleId || "";

  if (!circle) {
    const body = JSON.stringify({
      circleId: "",
      member: address,
      onTime: 0,
      late: 0,
      paidOut: 0,
      rounds: [],
      blobIds: [],
      source: "ledger",
      network: "mock",
      nudge: null,
    });
    return new Response(redact(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const names = demoNameByAddress(saved);
    const trust = await getMemberTrust(circle, address, {
      memberLabel: names[address] || "Member",
      packageId: getPackageId() || saved.packageId || undefined,
    });
    const body = JSON.stringify(trust);
    return new Response(redact(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "trust failed";
    const body = JSON.stringify({ error: message });
    return new Response(redact(body), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
