import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionClearCookieHeader } from "@/lib/crypto-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionClearCookieHeader(),
    },
  });
}
