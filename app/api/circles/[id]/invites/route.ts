import { createInvite, getStoredCircle, isCircleMember, listCircleInvites } from "@/lib/circle-registry";
import { getRequestSession, jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const { id } = await context.params;
  const circle = await getStoredCircle(id);
  if (!circle || !circle.members.includes(session.address)) {
    return jsonError("not your circle", 404);
  }
  const invites = await listCircleInvites(id);
  const general = invites.filter((i) => i.kind === "general");
  const direct = session.address === circle.creator ? invites.filter((i) => i.kind === "direct") : [];
  return Response.json({ invites: [...general, ...direct] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const { id } = await context.params;
  const circle = await getStoredCircle(id);
  if (!circle) return jsonError("not your circle", 404);
  const body = (await request.json().catch(() => null)) as {
    kind?: "direct" | "general";
    username?: string;
  } | null;
  const result = await createInvite({
    circle,
    actor: session.address,
    kind: body?.kind === "direct" ? "direct" : "general",
    username: body?.username,
  });
  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : 400;
    return jsonError(result.reason, status);
  }
  return Response.json({ invite: result.invite });
}
