"use client";

import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { PENDING_INVITE_KEY, parsePendingInvite } from "@/lib/pending-invite";
import { isProfileComplete } from "@/lib/profile";
import { afterAuthPath } from "@/lib/route-guards";

export default function AuthCallbackPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!account || ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        const challengeRes = await fetch("/api/auth/challenge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address: account.address }),
        });
        const challenge = (await challengeRes.json()) as { code: string; message: string };
        const signed = await signPersonalMessage({
          message: new TextEncoder().encode(challenge.message),
        });
        const verified = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            address: account.address,
            signature: signed.signature,
            code: challenge.code,
            authMethod: "google",
            walletName: "Google",
          }),
        });
        const data = (await verified.json()) as { hasProfile?: boolean };
        const pending = parsePendingInvite(sessionStorage.getItem(PENDING_INVITE_KEY));
        const me = await fetch("/api/auth/me").then((r) => r.json());
        router.replace(
          afterAuthPath({
            hasProfile: Boolean(data.hasProfile),
            pendingInvite: pending?.returnTo,
            circleCount: me.circleCount ?? 0,
          }),
        );
      } catch {
        router.replace("/?google=failed");
      }
    })();
  }, [account, router, signPersonalMessage]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <p className="flex items-center gap-2 text-body" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Creating your wallet
      </p>
    </main>
  );
}
