import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "./lib/crypto-session";
import { isPublicPath, signedOutDestination } from "./lib/route-guards";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname) || pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/") && !isPublicPath(pathname) && pathname !== "/api/public-config") {
      return NextResponse.next();
    }
    return NextResponse.next();
  }
  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = signedOutDestination(pathname) === "/" ? "/" : "/";
    if (pathname !== "/") url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Let public static assets through (icons, OG/Twitter images, brand, manifest).
  matcher: [
    "/((?!_next/static|_next/image|brand|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
