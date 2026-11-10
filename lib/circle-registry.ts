import "server-only";
import { randomBytes } from "node:crypto";
import { kvGet, kvSet } from "./kv";
import { getAddressByUsername, getProfile, normalizeAddress } from "./auth-store";
import { publicProfile } from "./profile";

export type StoredCircle = {
  id: string;
  name: string;
  creator: string;
  members: string[];
  maxMembers: number;
  amount: number;
  autoPayout: boolean;
  started: boolean;
  createdAt: string;
};

export type InviteKind = "direct" | "general";
export type InviteStatus = "active" | "revoked" | "full" | "started";

export type StoredInvite = {
  code: string;
  kind: InviteKind;
  circleId: string;
  creator: string;
  username?: string;
  address?: string;
  status: InviteStatus;
  createdAt: string;
};

function circleKey(id: string) {
  return `circle:${id}`;
}
function userCirclesKey(address: string) {
  return `user-circles:${normalizeAddress(address)}`;
}
function inviteKey(code: string) {
  return `invite:${code.toUpperCase()}`;
}
function circleInvitesKey(id: string) {
  return `circle-invites:${id}`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function getStoredCircle(id: string): Promise<StoredCircle | null> {
  return readJson<StoredCircle>(circleKey(id));
}

export async function saveStoredCircle(circle: StoredCircle): Promise<void> {
  await kvSet(circleKey(circle.id), JSON.stringify(circle));
  for (const member of circle.members) {
    await addUserCircle(member, circle.id);
  }
}

async function addUserCircle(address: string, circleId: string): Promise<void> {
  const list = (await readJson<string[]>(userCirclesKey(address))) ?? [];
  if (!list.includes(circleId)) list.push(circleId);
  await kvSet(userCirclesKey(address), JSON.stringify(list));
}

export async function listUserCircleIds(address: string): Promise<string[]> {
  return (await readJson<string[]>(userCirclesKey(address))) ?? [];
}

export function isCircleMember(circle: StoredCircle, address: string): boolean {
  const who = normalizeAddress(address);
  return circle.members.some((m) => normalizeAddress(m) === who);
}

export async function addCircleMember(circleId: string, address: string): Promise<StoredCircle | null> {
  const circle = await getStoredCircle(circleId);
  if (!circle) return null;
  if (!isCircleMember(circle, address)) {
    circle.members.push(normalizeAddress(address));
  }
  if (circle.members.length >= circle.maxMembers) {
    await invalidateInvitesForCircle(circleId, "full");
  }
  await saveStoredCircle(circle);
  return circle;
}

export function newInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i += 1) tail += alphabet[bytes[i]! % alphabet.length];
  return `KOLO-${tail}`;
}

export async function createInvite(args: {
  circle: StoredCircle;
  actor: string;
  kind: InviteKind;
  username?: string;
}): Promise<{ ok: true; invite: StoredInvite } | { ok: false; reason: string }> {
  const actor = normalizeAddress(args.actor);
  if (!isCircleMember(args.circle, actor)) return { ok: false, reason: "forbidden" };
  if (args.circle.started || args.circle.members.length >= args.circle.maxMembers) {
    return { ok: false, reason: "closed" };
  }
  if (args.kind === "direct") {
    if (actor !== normalizeAddress(args.circle.creator)) return { ok: false, reason: "forbidden" };
    const username = args.username?.trim().toLowerCase();
    if (!username) return { ok: false, reason: "username" };
    const address = await getAddressByUsername(username);
    if (!address) return { ok: false, reason: "unknown_user" };
    const invite: StoredInvite = {
      code: newInviteCode(),
      kind: "direct",
      circleId: args.circle.id,
      creator: args.circle.creator,
      username,
      address,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await persistInvite(invite);
    return { ok: true, invite };
  }
  const invite: StoredInvite = {
    code: newInviteCode(),
    kind: "general",
    circleId: args.circle.id,
    creator: args.circle.creator,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await persistInvite(invite);
  return { ok: true, invite };
}

async function persistInvite(invite: StoredInvite): Promise<void> {
  await kvSet(inviteKey(invite.code), JSON.stringify(invite));
  const list = (await readJson<string[]>(circleInvitesKey(invite.circleId))) ?? [];
  if (!list.includes(invite.code)) list.push(invite.code);
  await kvSet(circleInvitesKey(invite.circleId), JSON.stringify(list));
}

export async function getInvite(code: string): Promise<StoredInvite | null> {
  return readJson<StoredInvite>(inviteKey(code.trim().toUpperCase()));
}

export async function listCircleInvites(circleId: string): Promise<StoredInvite[]> {
  const codes = (await readJson<string[]>(circleInvitesKey(circleId))) ?? [];
  const out: StoredInvite[] = [];
  for (const code of codes) {
    const invite = await getInvite(code);
    if (invite) out.push(invite);
  }
  return out;
}

export async function revokeInvite(code: string, actor: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const invite = await getInvite(code);
  if (!invite) return { ok: false, reason: "missing" };
  const circle = await getStoredCircle(invite.circleId);
  if (!circle || normalizeAddress(circle.creator) !== normalizeAddress(actor)) {
    return { ok: false, reason: "forbidden" };
  }
  invite.status = "revoked";
  await kvSet(inviteKey(invite.code), JSON.stringify(invite));
  return { ok: true };
}

async function invalidateInvitesForCircle(circleId: string, status: InviteStatus): Promise<void> {
  const invites = await listCircleInvites(circleId);
  for (const invite of invites) {
    if (invite.status === "active") {
      invite.status = status;
      await kvSet(inviteKey(invite.code), JSON.stringify(invite));
    }
  }
}

export async function markCircleStarted(circleId: string): Promise<void> {
  const circle = await getStoredCircle(circleId);
  if (!circle) return;
  circle.started = true;
  await saveStoredCircle(circle);
  await invalidateInvitesForCircle(circleId, "started");
}

export type InvitePreview =
  | { ok: true; invite: StoredInvite; circle: StoredCircle; inviterName?: string }
  | { ok: false; reason: "missing" | "revoked" | "full" | "started" | "wrong_user" | "unsigned" };

export async function previewInvite(code: string, viewer: string | null): Promise<InvitePreview> {
  const invite = await getInvite(code);
  if (!invite) return { ok: false, reason: "missing" };
  if (invite.status === "revoked") return { ok: false, reason: "revoked" };
  const circle = await getStoredCircle(invite.circleId);
  if (!circle) return { ok: false, reason: "missing" };
  if (circle.started || invite.status === "started") return { ok: false, reason: "started" };
  if (circle.members.length >= circle.maxMembers || invite.status === "full") {
    return { ok: false, reason: "full" };
  }
  if (invite.kind === "direct") {
    if (!viewer) return { ok: false, reason: "unsigned" };
    if (normalizeAddress(viewer) !== normalizeAddress(invite.address ?? "")) {
      return { ok: false, reason: "wrong_user" };
    }
  }
  const creatorProfile = await getProfile(circle.creator);
  return {
    ok: true,
    invite,
    circle,
    inviterName: creatorProfile?.displayName,
  };
}

export async function memberDisplayNames(circle: StoredCircle): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const address of circle.members) {
    const profile = await getProfile(address);
    if (profile) map[normalizeAddress(address)] = profile.displayName;
  }
  return map;
}

export function publicMember(profile: Awaited<ReturnType<typeof getProfile>>) {
  if (!profile) return null;
  return publicProfile(profile);
}

export function canViewInvites(circle: StoredCircle, actor: string): boolean {
  return isCircleMember(circle, actor);
}

export function canCreateDirectInvite(circle: StoredCircle, actor: string): boolean {
  return normalizeAddress(circle.creator) === normalizeAddress(actor);
}
