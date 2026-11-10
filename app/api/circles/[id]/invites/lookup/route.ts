import { getAddressByUsername, normalizeAddress } from "@/lib/auth-store";
import { getStoredCircle } from "@/lib/circle-registry";
import { getAddressTrustSummary } from "@/lib/member-trust";
import { getRequestSession, jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

/**
 * Creator-only username resolve + cross-circle trust summary for the invite screen.
 * Never returns personal names from memory — counts and one blob link only.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);

  const { id } = await context.params;
  const circle = await getStoredCircle(id);
  if (!circle) return jsonError("not your circle", 404);

  if (normalizeAddress(session.address) !== normalizeAddress(circle.creator)) {
    return jsonError("forbidden", 403);
  }

  const url = new URL(request.url);
  const username = (url.searchParams.get("username") || "").trim().toLowerCase();
  if (!username) return jsonError("username", 400);

  const address = await getAddressByUsername(username);
  if (!address) {
    return Response.json({
      found: false,
      username,
      trust: null,
    });
  }

  const trust = await getAddressTrustSummary(address);
  return Response.json({
    found: true,
    username,
    address,
    trust: {
      onTime: trust.onTime,
      late: trust.late,
      paidRounds: trust.paidRounds,
      paidOut: trust.paidOut,
      hasRecord: trust.hasRecord,
      blobLink: trust.blobLink,
      source: trust.source,
      network: trust.network,
      line: trust.line,
    },
  });
}
