import { getProfile } from "@/lib/auth-store";
import { listUserCircleIds } from "@/lib/circle-registry";
import { getRequestSession, jsonError } from "@/lib/request-session";
import { ownProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const profile = await getProfile(session.address);
  const circleIds = await listUserCircleIds(session.address);
  return Response.json({
    session: {
      address: session.address,
      authMethod: session.authMethod,
      walletName: session.walletName,
      expiresAt: new Date(session.exp).toISOString(),
    },
    profile: profile ? ownProfile(profile) : null,
    circleCount: circleIds.length,
  });
}
