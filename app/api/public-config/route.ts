import { getCoinType, getPackageId } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    packageId: getPackageId() ?? null,
    coinType: getCoinType(),
    googleEnabled: Boolean(process.env.NEXT_PUBLIC_ENOKI_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  });
}
