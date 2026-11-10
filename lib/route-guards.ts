export const PUBLIC_PATHS = [
  "/",
  "/terms",
  "/privacy",
  "/circles",
  "/circles/demo",
  "/auth/callback",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/join/")) return true;
  if (pathname.startsWith("/brand/") || pathname.startsWith("/_next/")) return true;
  if (/\.(?:ico|png|svg|jpg|jpeg|gif|webp|webmanifest)$/i.test(pathname)) return true;
  if (pathname.startsWith("/api/auth/challenge")) return true;
  if (pathname.startsWith("/api/auth/verify")) return true;
  if (pathname.startsWith("/api/join/")) return true;
  if (pathname === "/api/health") return true;
  return false;
}

export function signedOutDestination(returnTo?: string): string {
  const target = returnTo && returnTo.startsWith("/") ? returnTo : "/";
  if (target === "/") return "/";
  return `/?returnTo=${encodeURIComponent(target)}`;
}

export function afterAuthPath(args: {
  hasProfile: boolean;
  pendingInvite?: string | null;
  circleCount: number;
}): string {
  if (!args.hasProfile) return "/profile";
  if (args.pendingInvite) return args.pendingInvite;
  if (args.circleCount > 0) return "/circles";
  return "/circles/new";
}
