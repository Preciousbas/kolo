import "server-only";
import { randomBytes } from "node:crypto";
import { nowMs } from "./clock";
import { kvDel, kvGet, kvSet } from "./kv";
import { publicProfile, signInMessage, type Profile } from "./profile";

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type Challenge = {
  code: string;
  address: string;
  createdAt: number;
  used: boolean;
};

function challengeKey(code: string) {
  return `challenge:${code}`;
}

function profileKey(address: string) {
  return `profile:${normalizeAddress(address)}`;
}

function usernameKey(username: string) {
  return `username:${username.trim().toLowerCase()}`;
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function newChallengeCode(): string {
  return randomBytes(16).toString("hex");
}

export function isoDate(ms = nowMs()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function issueChallenge(address: string): Promise<{ code: string; message: string; expiresAt: string }> {
  const code = newChallengeCode();
  const createdAt = nowMs();
  const challenge: Challenge = { code, address: normalizeAddress(address), createdAt, used: false };
  await kvSet(challengeKey(code), JSON.stringify(challenge), Math.ceil(CHALLENGE_TTL_MS / 1000));
  const message = signInMessage({ address: challenge.address, date: isoDate(createdAt), code });
  return { code, message, expiresAt: new Date(createdAt + CHALLENGE_TTL_MS).toISOString() };
}

export async function consumeChallenge(code: string, address: string): Promise<{ ok: true; message: string } | { ok: false; reason: string }> {
  const raw = await kvGet(challengeKey(code));
  if (!raw) return { ok: false, reason: "invalid" };
  const challenge = JSON.parse(raw) as Challenge;
  if (challenge.used) return { ok: false, reason: "used" };
  if (nowMs() - challenge.createdAt > CHALLENGE_TTL_MS) {
    await kvDel(challengeKey(code));
    return { ok: false, reason: "expired" };
  }
  if (normalizeAddress(challenge.address) !== normalizeAddress(address)) {
    return { ok: false, reason: "address" };
  }
  challenge.used = true;
  await kvSet(challengeKey(code), JSON.stringify(challenge), 60);
  const message = signInMessage({
    address: challenge.address,
    date: isoDate(challenge.createdAt),
    code: challenge.code,
  });
  return { ok: true, message };
}

export async function getProfile(address: string): Promise<Profile | null> {
  const raw = await kvGet(profileKey(address));
  if (!raw) return null;
  return JSON.parse(raw) as Profile;
}

export async function getAddressByUsername(username: string): Promise<string | null> {
  const raw = await kvGet(usernameKey(username));
  return raw;
}

export async function saveProfile(profile: Profile): Promise<{ ok: true } | { ok: false; reason: "username_taken" }> {
  const existingUser = await getAddressByUsername(profile.username);
  if (existingUser && normalizeAddress(existingUser) !== normalizeAddress(profile.address)) {
    return { ok: false, reason: "username_taken" };
  }
  const previous = await getProfile(profile.address);
  if (previous && previous.username !== profile.username) {
    await kvDel(usernameKey(previous.username));
  }
  const stored: Profile = { ...profile, address: normalizeAddress(profile.address) };
  await kvSet(profileKey(stored.address), JSON.stringify(stored));
  await kvSet(usernameKey(stored.username), stored.address);
  return { ok: true };
}

export function memberSafeProfile(profile: Profile) {
  return publicProfile(profile);
}
