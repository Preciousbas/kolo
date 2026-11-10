import { CreateCircleForm } from "@/components/create-circle-form";
import { getCoinType, getPackageId } from "@/lib/config";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export default async function NewCirclePage() {
  const { profile } = await requireUser();
  return (
    <CreateCircleForm
      displayName={profile.displayName}
      packageId={getPackageId() ?? null}
      coinType={getCoinType()}
    />
  );
}
