import { issueChallenge } from "@/lib/auth-store";
import { jsonError } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address?.trim();
  if (!address || !address.startsWith("0x")) return jsonError("address required", 400);
  const challenge = await issueChallenge(address);
  return Response.json(challenge);
}
