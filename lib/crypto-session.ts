export const SESSION_COOKIE = "kolo_session";
export const WALLET_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthMethod = "wallet" | "google";

export type SessionPayload = {
  address: string;
  authMethod: AuthMethod;
  walletName?: string;
  exp: number;
};

function secret(): string {
  const value = process.env.KOLO_SESSION_SECRET;
  if (!value) throw new Error("missing KOLO_SESSION_SECRET");
  return value;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

async function hmac(encoded: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, utf8(encoded));
  return toBase64Url(new Uint8Array(sig));
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  const encoded = toBase64Url(utf8(JSON.stringify(payload)));
  const mac = await hmac(encoded);
  return `${encoded}.${mac}`;
}

export async function decodeSession(
  cookie: string | undefined | null,
  now = Date.now(),
): Promise<SessionPayload | null> {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = cookie.slice(0, dot);
  const mac = cookie.slice(dot + 1);
  try {
    const expected = await hmac(encoded);
    if (!equal(mac, expected)) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionPayload;
    if (!payload?.address || !payload.authMethod || typeof payload.exp !== "number") return null;
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(opts?: { production?: boolean; maxAgeMs?: number }) {
  const production = opts?.production ?? process.env.NODE_ENV === "production";
  const maxAgeMs = opts?.maxAgeMs ?? WALLET_SESSION_MS;
  return {
    httpOnly: true as const,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

export async function sessionSetCookieHeader(payload: SessionPayload, opts?: { production?: boolean }): Promise<string> {
  const encoded = await encodeSession(payload);
  const flags = sessionCookieOptions({
    production: opts?.production,
    maxAgeMs: Math.max(0, payload.exp - Date.now()),
  });
  const parts = [
    `${SESSION_COOKIE}=${encoded}`,
    "HttpOnly",
    `Path=${flags.path}`,
    "SameSite=Lax",
    `Max-Age=${flags.maxAge}`,
  ];
  if (flags.secure) parts.push("Secure");
  return parts.join("; ");
}

export function sessionClearCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
