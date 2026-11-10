import { getStoredCircle, revokeInvite } from "@/lib/circle-registry";
import { getRequestSession, jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; code: string }> },
) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const { id, code } = await context.params;
  const circle = await getStoredCircle(id);
  if (!circle) return jsonError("not your circle", 404);
  const result = await revokeInvite(code, session.address);
  if (!result.ok) return jsonError(result.reason, result.reason === "forbidden" ? 403 : 400);
  return Response.json({ ok: true });
}
