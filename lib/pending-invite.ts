export const PENDING_INVITE_KEY = "kolo.pendingInvite";
export const PENDING_INVITE_MS = 30 * 60 * 1000;

export type PendingInvite = {
  code: string;
  inviter?: string;
  circleId?: string;
  returnTo: string;
  savedAt: string;
};

export function parsePendingInvite(raw: string | null | undefined, now = Date.now()): PendingInvite | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingInvite;
    if (!parsed?.code || !parsed.savedAt || !parsed.returnTo) return null;
    const saved = Date.parse(parsed.savedAt);
    if (!Number.isFinite(saved) || now - saved > PENDING_INVITE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function pendingInviteFromCode(code: string, extra?: Partial<PendingInvite>): PendingInvite {
  const normalized = code.trim();
  return {
    code: normalized,
    returnTo: extra?.returnTo ?? `/join/${encodeURIComponent(normalized)}`,
    savedAt: extra?.savedAt ?? new Date().toISOString(),
    inviter: extra?.inviter,
    circleId: extra?.circleId,
  };
}
