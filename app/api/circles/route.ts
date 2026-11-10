import { getProfile } from "@/lib/auth-store";
import {
  getStoredCircle,
  listUserCircleIds,
  saveStoredCircle,
  type StoredCircle,
} from "@/lib/circle-registry";
import { getRequestSession, jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const ids = await listUserCircleIds(session.address);
  const circles = [];
  for (const id of ids) {
    const circle = await getStoredCircle(id);
    if (!circle) continue;
    const mine = await getProfile(session.address);
    circles.push({
      id: circle.id,
      name: circle.name,
      memberCount: circle.members.length,
      maxMembers: circle.maxMembers,
      started: circle.started,
      you: mine?.displayName ?? null,
    });
  }
  return Response.json({ circles });
}

export async function POST(request: Request) {
  const session = await getRequestSession();
  if (!session) return jsonError("signed out", 401);
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    maxMembers?: number;
    amount?: number;
    autoPayout?: boolean;
  } | null;
  const id = body?.id?.trim();
  const name = body?.name?.trim();
  const maxMembers = Number(body?.maxMembers ?? 6);
  if (!id || !name) return jsonError("id and name required", 400);
  if (maxMembers < 3 || maxMembers > 6) return jsonError("members must be 3 to 6", 400);
  const existing = await getStoredCircle(id);
  if (existing) return Response.json({ circle: existing });
  const circle: StoredCircle = {
    id,
    name,
    creator: session.address,
    members: [session.address],
    maxMembers,
    amount: Number(body?.amount ?? 0),
    autoPayout: Boolean(body?.autoPayout ?? true),
    started: false,
    createdAt: new Date().toISOString(),
  };
  await saveStoredCircle(circle);
  return Response.json({ circle });
}
