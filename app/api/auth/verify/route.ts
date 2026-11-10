import { cookies } from "next/headers";
import { consumeChallenge, getProfile, normalizeAddress } from "@/lib/auth-store";
import {
  encodeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  WALLET_SESSION_MS,
  type AuthMethod,
} from "@/lib/crypto-session";
import { isProfileComplete } from "@/lib/profile";
import { jsonError } from "@/lib/request-session";
import { verifySignInMessage } from "@/lib/verify-signin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    address?: string;
    signature?: string;
    code?: string;
    authMethod?: AuthMethod;
    walletName?: string;
  } | null;
  const address = body?.address?.trim();
  const signature = body?.signature;
  const code = body?.code?.trim();
  const authMethod = body?.authMethod === "google" ? "google" : "wallet";
  if (!address || !signature || !code) return jsonError("address, signature and code required", 400);

  const consumed = await consumeChallenge(code, address);
  if (!consumed.ok) return jsonError("not signed in", 401);

  const valid = await verifySignInMessage({
    message: consumed.message,
    signature,
    address: normalizeAddress(address),
  });
  if (!valid) return jsonError("not signed in", 401);

  const profile = await getProfile(address);
  const exp = Date.now() + WALLET_SESSION_MS;
  const token = await encodeSession({
    address: normalizeAddress(address),
    authMethod,
    walletName: body?.walletName,
    exp,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions({ maxAgeMs: WALLET_SESSION_MS }));
  return Response.json({
    ok: true,
    hasProfile: isProfileComplete(profile),
    displayName: profile?.displayName ?? null,
  });
}
