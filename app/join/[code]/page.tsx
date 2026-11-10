import { redirect } from "next/navigation";
import { JoinCircle } from "@/components/join-circle";
import { SignInFlow } from "@/components/sign-in-flow";
import { previewInvite } from "@/lib/circle-registry";
import { getCoinType, getPackageId } from "@/lib/config";
import { getProfile } from "@/lib/auth-store";
import { incompleteProfileRedirect, isProfileComplete } from "@/lib/profile";
import { getRequestSession } from "@/lib/request-session";

export const dynamic = "force-dynamic";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const session = await getRequestSession();
  const preview = await previewInvite(decoded, session?.address ?? null);

  if (!session) {
    return (
      <SignInFlow
        invite={{
          code: decoded,
          inviter: preview.ok ? preview.inviterName : undefined,
          circleName: preview.ok ? preview.circle.name : undefined,
        }}
      />
    );
  }
  const profile = await getProfile(session.address);
  const toProfile = incompleteProfileRedirect(profile);
  if (toProfile) redirect(toProfile);
  if (!isProfileComplete(profile)) redirect("/profile");
  return (
    <JoinCircle
      displayName={profile.displayName}
      code={decoded}
      returning
      packageId={getPackageId() ?? null}
      coinType={getCoinType()}
    />
  );
}
