"use client";

import {
  useConnectWallet,
  useCurrentWallet,
  useSignPersonalMessage,
  useWallets,
} from "@mysten/dapp-kit";
import type { WalletWithRequiredFeatures } from "@mysten/wallet-standard";
import { isGoogleWallet } from "@mysten/enoki";
import { Check, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GoogleG } from "@/components/google-g";
import { KoloLogo } from "@/components/kolo-logo";
import { KoloSheet } from "@/components/kolo-sheet";
import { PENDING_INVITE_KEY, parsePendingInvite, pendingInviteFromCode } from "@/lib/pending-invite";
import { isProfileComplete } from "@/lib/profile";
import { afterAuthPath } from "@/lib/route-guards";
import { Button } from "@/components/ui/button";

type Sheet =
  | "none"
  | "wallets"
  | "noneFound"
  | "connecting"
  | "sign"
  | "rejected"
  | "google"
  | "googleSetup"
  | "googleFail";

function googleReady() {
  return Boolean(process.env.NEXT_PUBLIC_ENOKI_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

function hideFromWalletSheet(wallet: WalletWithRequiredFeatures) {
  return isGoogleWallet(wallet as never);
}

export function SignInFlow({
  invite,
}: {
  invite?: { code: string; inviter?: string; circleName?: string } | null;
}) {
  const router = useRouter();
  const wallets = useWallets();
  const { currentWallet, connectionStatus, isConnected } = useCurrentWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: connect } = useConnectWallet();
  const [sheet, setSheet] = useState<Sheet>("none");
  const [busy, setBusy] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    if (!invite) return;
    const pending = pendingInviteFromCode(invite.code, {
      inviter: invite.inviter,
    });
    sessionStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(pending));
  }, [invite]);

  const detected = useMemo(() => {
    return wallets.filter((w) => !hideFromWalletSheet(w));
  }, [wallets]);

  const slush = detected.find((w) => w.name.toLowerCase().includes("slush"));
  const others = detected.filter((w) => w !== slush);
  const enokiGoogle = wallets.find((w) => isGoogleWallet(w as never));

  async function finishSession(args: {
    address: string;
    signature: string;
    code: string;
    authMethod: "wallet" | "google";
    walletName?: string;
  }) {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error("verify failed");
    const pending = parsePendingInvite(sessionStorage.getItem(PENDING_INVITE_KEY));
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
    const next = afterAuthPath({
      hasProfile: isProfileComplete(me.profile),
      pendingInvite: pending?.returnTo,
      circleCount: me.circleCount ?? 0,
    });
    router.push(next);
    router.refresh();
  }

  async function signForAddress(address: string, authMethod: "wallet" | "google", walletName?: string) {
    const challengeRes = await fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!challengeRes.ok) throw new Error("challenge failed");
    const challenge = (await challengeRes.json()) as { code: string; message: string };
    const signed = await Promise.race([
      signPersonalMessage({ message: new TextEncoder().encode(challenge.message) }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 60_000);
      }),
    ]);
    await finishSession({
      address,
      signature: signed.signature,
      code: challenge.code,
      authMethod,
      walletName,
    });
  }

  async function connectWallet(wallet: WalletWithRequiredFeatures) {
    setSheet("connecting");
    setBusy(true);
    try {
      const connected = await connect({ wallet });
      const account = connected.accounts[0] ?? wallet.accounts[0];
      if (!account) throw new Error("no account");
      setSheet("sign");
      await signForAddress(account.address, "wallet", wallet.name);
    } catch {
      setSheet("rejected");
    } finally {
      setBusy(false);
    }
  }

  async function startGoogle(redirect = false) {
    if (!googleReady()) return;
    setPopupBlocked(false);
    setSheet("google");
    setBusy(true);
    try {
      if (!enokiGoogle) {
        if (redirect) {
          window.location.assign("/auth/callback");
          return;
        }
        setPopupBlocked(true);
        setSheet("googleFail");
        return;
      }
      const openedAt = Date.now();
      await enokiGoogle.features["standard:connect"].connect();
      if (Date.now() - openedAt < 1000) {
        setPopupBlocked(true);
        setSheet("googleFail");
        return;
      }
      setSheet("googleSetup");
      const account = enokiGoogle.accounts[0];
      if (!account) throw new Error("no account");
      await signForAddress(account.address, "google", "Google");
    } catch {
      setSheet("googleFail");
    } finally {
      setBusy(false);
    }
  }

  function openWallets() {
    if (detected.length === 0) setSheet("noneFound");
    else setSheet("wallets");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col bg-background px-6 pb-8 pt-10 text-foreground">
      <KoloLogo variant="lockup" className="h-12 w-auto self-start" priority />
      <h1 className="mt-8 text-display font-extrabold tracking-tight">
        Save together.
        <br />
        Get paid on your turn.
      </h1>
      {invite ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent-soft p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-body font-bold text-primary">
            {(invite.inviter ?? "K")[0]}
          </div>
          <p className="text-small">
            <b>
              {invite.inviter ?? "Someone"} invited you to {invite.circleName ?? "a Kolo circle"}.
            </b>
            <br />
            <span className="text-muted-foreground">Sign in and we&apos;ll take you straight back to the invite.</span>
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-body text-muted-foreground">
            Run your ajo, esusu or family contribution in one place. Kolo tracks who has paid, reminds people at the right
            time and pays out the pot when it&apos;s full.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-body">
              <Check className="h-5 w-5 text-success" />
              Everyone sees the same record
            </div>
            <div className="flex items-center gap-3 text-body">
              <Check className="h-5 w-5 text-success" />
              The pot pays out automatically
            </div>
            <div className="flex items-center gap-3 text-body">
              <Check className="h-5 w-5 text-success" />
              Kolo learns how your circle pays
            </div>
          </div>
        </>
      )}
      <div className="mt-auto space-y-3 pt-10">
        <Button
          variant="outline"
          className="h-14 w-full rounded-2xl border-2 text-[16px] font-bold"
          onClick={openWallets}
        >
          <Wallet className="h-5 w-5" />
          Connect a wallet
        </Button>
        <Button
          variant="outline"
          className="h-14 w-full rounded-2xl border-2 text-[16px] font-bold"
          disabled={!googleReady()}
          onClick={() => startGoogle(false)}
        >
          <GoogleG />
          {googleReady() ? "Continue with Google" : "Coming soon"}
        </Button>
        <p className="px-2 text-center text-small text-muted-foreground">
          No wallet yet? Continue with Google and Kolo sets one up for you. Your money stays yours either way.
        </p>
        <p className="text-center text-[12px] text-muted-foreground">
          By continuing you agree to Kolo&apos;s{" "}
          <Link href="/terms" className="underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>
          .
        </p>
      </div>

      <KoloSheet title="Connect a wallet" open={sheet === "wallets"} onClose={() => setSheet("none")}>
        <p className="mb-4 -mt-1 text-body text-muted-foreground">
          Pick the wallet you use. You&apos;ll approve in that app. Kolo never sees your recovery phrase.
        </p>
        {slush ? (
          <button
            type="button"
            className="mb-2 flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-primary-soft/40 p-3 text-left"
            onClick={() => connectWallet(slush)}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-h3 font-extrabold text-background">
              S
            </span>
            <span className="flex-1">
              <span className="block text-body font-bold">Slush</span>
              <span className="text-small text-muted-foreground">Recommended</span>
            </span>
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success">
              On this device
            </span>
          </button>
        ) : null}
        {others.length > 0 ? <p className="mb-2 mt-5 text-small font-bold">Other wallets</p> : null}
        <div className="space-y-2">
          {others.map((wallet) => (
            <button
              key={wallet.name}
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-card p-3 text-left"
              onClick={() => connectWallet(wallet)}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-h3 font-extrabold">
                {wallet.name[0]}
              </span>
              <span className="flex-1">
                <span className="block text-body font-bold">{wallet.name}</span>
                <span className="text-small text-muted-foreground">On this device</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-small text-muted-foreground">
          Don&apos;t see yours?{" "}
          <a href="https://slush.app/download" className="font-bold text-primary underline underline-offset-4">
            Get Slush
          </a>{" "}
          or{" "}
          <button type="button" className="font-bold text-primary underline underline-offset-4" onClick={() => startGoogle(false)}>
            continue with Google
          </button>
        </p>
      </KoloSheet>

      <KoloSheet title="No wallet found" open={sheet === "noneFound"} onClose={() => setSheet("none")}>
        <div className="pt-2 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-h2 font-bold">No wallet app found</h3>
          <p className="mt-2 text-body text-muted-foreground">
            You can get Slush (free, about 2 minutes), or skip it and continue with Google. Kolo will set up a wallet for you.
          </p>
        </div>
        <div className="mt-5 space-y-2">
          <Button className="h-14 w-full rounded-2xl text-[16px] font-bold" onClick={() => startGoogle(false)}>
            Continue with Google
          </Button>
          <a
            href="https://slush.app/download"
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl border-2 border-border bg-card text-[16px] font-bold hover:scale-95"
          >
            Get Slush
          </a>
          <Button variant="ghost" className="h-11 w-full text-[15px] font-bold text-primary" onClick={openWallets}>
            I&apos;ve installed it · try again
          </Button>
        </div>
      </KoloSheet>

      <KoloSheet title="Connect" open={sheet === "connecting"} onClose={() => setSheet("wallets")}>
        <p className="text-micro uppercase text-muted-foreground">Step 1 of 2 · Connect</p>
        <h3 className="mt-1 text-h2 font-bold">Approve in {currentWallet?.name ?? "your wallet"}</h3>
        <p className="mt-2 text-body text-muted-foreground">This only shares your wallet address. It doesn&apos;t move any money.</p>
        <div className="mt-5 flex items-center gap-2 text-body" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Waiting for {currentWallet?.name ?? "wallet"}
        </div>
      </KoloSheet>

      <KoloSheet title="Prove it&apos;s you" open={sheet === "sign"} onClose={() => setSheet("none")}>
        <p className="text-micro uppercase text-muted-foreground">Step 2 of 2 · Prove it&apos;s you</p>
        <h3 className="mt-1 text-h2 font-bold">Sign in {currentWallet?.name ?? "your wallet"} to finish</h3>
        <div className="mt-4 space-y-2 rounded-2xl bg-secondary p-4 text-small">
          <p>
            <b>Free.</b> No fee, no payment, no money moves.
          </p>
          <p>
            The message reads <b>&quot;Sign in to Kolo&quot;</b> with today&apos;s date and a one-time code.
          </p>
        </div>
        <Button disabled className="mt-5 h-14 w-full rounded-2xl bg-primary/60 text-[16px] font-bold text-primary-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Waiting for your signature…
        </Button>
      </KoloSheet>

      <KoloSheet title="Not signed in" open={sheet === "rejected"} onClose={() => setSheet("none")}>
        <div className="flex gap-3 rounded-2xl bg-danger-soft p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive text-destructive-foreground">
            ×
          </div>
          <div>
            <div className="text-h3 text-destructive">You didn&apos;t sign, so you&apos;re not signed in</div>
            <p className="mt-0.5 text-small">
              That&apos;s fine. Nothing was shared and no money moved. Kolo needs the signature once to know the wallet is yours.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <Button className="h-14 w-full rounded-2xl text-[16px] font-bold" onClick={() => currentWallet && connectWallet(currentWallet)}>
            Sign again
          </Button>
          <Button variant="outline" className="h-14 w-full rounded-2xl border-2 text-[16px] font-bold" onClick={openWallets}>
            Use a different wallet
          </Button>
          <Button variant="ghost" className="h-11 w-full font-bold text-primary" onClick={() => startGoogle(false)}>
            Continue with Google instead
          </Button>
        </div>
      </KoloSheet>

      <KoloSheet title="Continue with Google" open={sheet === "google"} onClose={() => setSheet("none")}>
        <div className="pt-2 text-center">
          <h3 className="text-h2 font-bold">Opening Google…</h3>
          <p className="mt-2 text-body text-muted-foreground">
            Pick your Google account in the window that opens. Kolo only gets your name and email to set up your wallet.
          </p>
        </div>
        <Button disabled className="mt-6 h-14 w-full rounded-2xl bg-primary/60 text-[16px] font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Waiting for Google…
        </Button>
        <p className="mt-3 text-center text-small text-muted-foreground">
          Nothing opened?{" "}
          <button type="button" className="font-bold text-primary underline underline-offset-4" onClick={() => startGoogle(true)}>
            Open Google sign-in
          </button>
        </p>
      </KoloSheet>

      <KoloSheet title="Almost there" open={sheet === "googleSetup"} onClose={() => setSheet("none")}>
        <div className="pt-1 text-center">
          <h3 className="mt-4 text-h2 font-bold">Setting up your Kolo wallet</h3>
          <p className="mt-2 text-body text-muted-foreground">
            This takes a few seconds. You won&apos;t need a recovery phrase. Your Google account is how you get back in.
          </p>
        </div>
        <div className="mt-4 rounded-2xl bg-secondary px-4 py-2">
          <div className="flex items-center gap-3 py-2 text-body">
            <Check className="h-5 w-5 text-success" />
            Signed in with Google
          </div>
          <div className="flex items-center gap-3 py-2 text-body font-bold" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Creating your wallet
          </div>
          <div className="flex items-center gap-3 py-2 text-body text-muted-foreground">Done</div>
        </div>
        <p className="mt-4 text-center text-small text-muted-foreground">Keep this page open.</p>
      </KoloSheet>

      <KoloSheet title="Not signed in" open={sheet === "googleFail"} onClose={() => setSheet("none")}>
        <div className="flex gap-3 rounded-2xl bg-danger-soft p-4">
          <div>
            <div className="text-h3 text-destructive">Google sign-in didn&apos;t finish</div>
            <p className="mt-0.5 text-small">
              The window was closed or Google said no. No wallet was created and nothing was saved.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 rounded-xl bg-secondary p-3 text-small text-muted-foreground">
          If no window opened, your browser may have blocked it. Allow pop-ups for Kolo, or tap Try again and we&apos;ll open
          Google in this tab.
        </div>
        <div className="mt-5 space-y-2">
          <Button className="h-14 w-full rounded-2xl text-[16px] font-bold" onClick={() => startGoogle(popupBlocked)}>
            Try again
          </Button>
          <Button variant="outline" className="h-14 w-full rounded-2xl border-2 text-[16px] font-bold" onClick={openWallets}>
            Connect a wallet instead
          </Button>
        </div>
      </KoloSheet>
      {busy || connectionStatus === "connecting" || isConnected ? null : null}
    </main>
  );
}
