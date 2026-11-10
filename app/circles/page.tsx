import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SignInFlow } from "@/components/sign-in-flow";
import { getStoredCircle, listUserCircleIds } from "@/lib/circle-registry";
import { getProfile } from "@/lib/auth-store";
import { incompleteProfileRedirect, isProfileComplete } from "@/lib/profile";
import { getRequestSession } from "@/lib/request-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CirclesPage() {
  const session = await getRequestSession();
  if (!session) {
    return (
      <main className="mx-auto min-h-screen max-w-xl bg-background px-6 py-10">
        <SignInFlow />
      </main>
    );
  }
  const profile = await getProfile(session.address);
  const toProfile = incompleteProfileRedirect(profile);
  if (toProfile || !isProfileComplete(profile)) redirect("/profile");
  const ids = await listUserCircleIds(session.address);
  const circles = [];
  for (const id of ids) {
    const c = await getStoredCircle(id);
    if (c) circles.push(c);
  }
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-background">
      <AppHeader
        title="Kolo"
        displayName={profile.displayName}
        address={session.address}
        authMethod={session.authMethod}
        walletName={session.walletName}
      />
      <div className="space-y-3 px-5">
        {circles.length === 0 ? (
          <p className="text-body text-muted-foreground">You are not in a circle yet.</p>
        ) : (
          circles.map((c) => (
            <Link key={c.id} href={`/circles/${c.id}`} className="block rounded-2xl border border-border bg-card p-4">
              <div className="text-h3 font-bold">{c.name}</div>
              <div className="text-small text-muted-foreground">
                {c.members.length} of {c.maxMembers} members
              </div>
            </Link>
          ))
        )}
        <Link href="/circles/new" className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground hover:scale-95">
          Start a circle
        </Link>
        <Link href="/join" className="ml-3 inline-flex h-14 items-center justify-center rounded-2xl border-2 border-border px-6 font-bold hover:scale-95">
          Join with a code
        </Link>
        <p className="pt-4 text-small text-muted-foreground">
          <Link href="/circles/demo" className="underline">
            Open the demo circle
          </Link>
        </p>
      </div>
    </main>
  );
}
