import { getStoredCircle, markCircleStarted } from "@/lib/circle-registry";
import { getRequestSession, jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const { id } = await context.params;
  const circle = await getStoredCircle(id);
  if (!circle || circle.creator !== session.address) return jsonError("not your circle", 404);
  await markCircleStarted(id);
  return Response.json({ ok: true });
}
