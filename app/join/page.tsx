import { JoinCircle } from "@/components/join-circle";
import { getCoinType, getPackageId } from "@/lib/config";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const { profile } = await requireUser();
  return (
    <JoinCircle displayName={profile.displayName} packageId={getPackageId() ?? null} coinType={getCoinType()} />
  );
}
