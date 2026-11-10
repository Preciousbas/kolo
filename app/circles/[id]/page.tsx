import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CircleHealth } from "@/components/circle-health";
import { InviteByUsername } from "@/components/invite-by-username";
import { normalizeAddress } from "@/lib/auth-store";
import { isDemoCircleId } from "@/lib/circle-access";
import { getStoredCircle, isCircleMember, memberDisplayNames } from "@/lib/circle-registry";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (isDemoCircleId(id)) {
    notFound();
  }
  const { session, profile } = await requireUser();
  const circle = await getStoredCircle(id);
  if (!circle) {
    notFound();
  }
  if (!isCircleMember(circle, session.address)) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-h1 font-bold">not your circle</h1>
        <p className="mt-2 text-body text-muted-foreground">This circle is only visible to its members.</p>
      </main>
    );
  }
  const names = await memberDisplayNames(circle);
  const isCreator = normalizeAddress(session.address) === normalizeAddress(circle.creator);
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-background">
      <AppHeader
        title={circle.name}
        subtitle={`Signed in as ${profile.displayName}`}
        displayName={profile.displayName}
        address={session.address}
        authMethod={session.authMethod}
        walletName={session.walletName}
      />
      <div className="space-y-3 px-5 pb-8">
        <p className="text-small text-muted-foreground">
          {circle.members.length} of {circle.maxMembers} members {circle.started ? "· started" : "· open"}
        </p>
        <ul className="space-y-2">
          {circle.members.map((address) => (
            <li key={address} className="rounded-xl bg-card px-4 py-3 text-body">
              {names[address] ?? names[address.toLowerCase()] ?? address.slice(0, 8)}
            </li>
          ))}
        </ul>
        {isCreator && !circle.started ? <InviteByUsername circleId={circle.id} /> : null}
        <CircleHealth />
      </div>
    </main>
  );
}
