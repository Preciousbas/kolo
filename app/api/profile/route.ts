import { getProfile, saveProfile } from "@/lib/auth-store";
import { getRequestSession, jsonError } from "@/lib/request-session";
import { ownProfile, validateProfileInput } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const profile = await getProfile(session.address);
  return Response.json({ profile: profile ? ownProfile(profile) : null });
}

export async function PUT(request: Request) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = validateProfileInput(body ?? {});
  if (!parsed.ok) {
    return Response.json(
      { error: `Fix ${parsed.errors.length} thing${parsed.errors.length === 1 ? "" : "s"} to continue.`, errors: parsed.errors },
      { status: 400 },
    );
  }
  const existing = await getProfile(session.address);
  const profile = {
    ...parsed.value,
    address: session.address,
    authMethod: session.authMethod,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const saved = await saveProfile(profile);
  if (!saved.ok) {
    return Response.json(
      { error: "Fix 1 thing to continue.", errors: [{ field: "username", message: "That username is taken." }] },
      { status: 409 },
    );
  }
  return Response.json({ profile: ownProfile(profile) });
}
