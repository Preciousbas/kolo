import { addCircleMember, previewInvite } from "@/lib/circle-registry";
import { getRequestSession, jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getRequestSession();
  const { code } = await context.params;
  const preview = await previewInvite(decodeURIComponent(code), session?.address ?? null);
  if (!preview.ok) {
    const message =
      preview.reason === "wrong_user"
        ? "this invite is for someone else"
        : preview.reason === "full"
          ? "this circle is full"
          : preview.reason === "revoked" || preview.reason === "started"
            ? "We can't find a circle with that code. Check it with the person who sent it. Codes look like KOLO- and 4 letters or numbers."
            : "We can't find a circle with that code. Check it with the person who sent it. Codes look like KOLO- and 4 letters or numbers.";
    return Response.json({ ok: false, reason: preview.reason, error: message }, { status: 404 });
  }
  return Response.json({
    ok: true,
    code: preview.invite.code,
    kind: preview.invite.kind,
    circle: {
      id: preview.circle.id,
      name: preview.circle.name,
      memberCount: preview.circle.members.length,
      maxMembers: preview.circle.maxMembers,
      amount: preview.circle.amount,
    },
    inviter: preview.inviterName ?? null,
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const { code } = await context.params;
  const preview = await previewInvite(decodeURIComponent(code), session.address);
  if (!preview.ok) {
    return jsonError(
      preview.reason === "wrong_user"
        ? "this invite is for someone else"
        : preview.reason === "full"
          ? "this circle is full"
          : "invalid invite",
      400,
    );
  }
  const circle = await addCircleMember(preview.circle.id, session.address);
  return Response.json({ ok: true, circleId: circle?.id });
}
