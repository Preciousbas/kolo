import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { getProfile } from "@/lib/auth-store";
import { listUserCircleIds } from "@/lib/circle-registry";
import { isProfileComplete } from "@/lib/profile";
import { getRequestSession } from "@/lib/request-session";
import { afterAuthPath } from "@/lib/route-guards";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; returnTo?: string }>;
}) {
  const session = await getRequestSession();
  if (!session) redirect("/");
  const profile = await getProfile(session.address);
  const query = await searchParams;
  const editing = query.edit === "1";
  if (isProfileComplete(profile) && !editing) {
    const circleCount = (await listUserCircleIds(session.address)).length;
    const returnTo = query.returnTo?.startsWith("/") ? query.returnTo : null;
    redirect(afterAuthPath({ hasProfile: true, pendingInvite: returnTo, circleCount }));
  }
  return (
    <ProfileForm
      address={session.address}
      authMethod={session.authMethod}
      walletName={session.walletName}
      initial={profile}
    />
  );
}
