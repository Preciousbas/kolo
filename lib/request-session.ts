import "server-only";
import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE, type SessionPayload } from "./crypto-session";

export async function sessionFromCookieHeader(header: string | null, now = Date.now()): Promise<SessionPayload | null> {
  if (!header) return null;
  const parts = header.split(/;\s*/);
  for (const part of parts) {
    if (part.startsWith(`${SESSION_COOKIE}=`)) {
      return decodeSession(part.slice(SESSION_COOKIE.length + 1), now);
    }
  }
  return null;
}

export async function getRequestSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
