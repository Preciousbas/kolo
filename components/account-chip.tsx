"use client";

import { Copy, ExternalLink, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { avatarInitial, shortAddress } from "@/lib/profile";

type Props = {
  displayName: string;
  address: string;
  authMethod: "wallet" | "google";
  walletName?: string;
};

export function AccountChip({ displayName, address, authMethod, walletName }: Props) {
  const router = useRouter();
  const current = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (current?.address && current.address.toLowerCase() !== address.toLowerCase()) {
      void fetch("/api/auth/logout", { method: "POST" }).then(() => {
        router.push("/");
        router.refresh();
      });
    }
  }, [current?.address, address, router]);

  async function copy() {
    await navigator.clipboard.writeText(address);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const methodLabel = authMethod === "google" ? "Signed in with Google" : `${walletName ?? "Slush"} wallet`;

  return (
    <>
      <button
        type="button"
        aria-label={`Account: ${displayName}, wallet ${shortAddress(address)}`}
        className="flex h-11 max-w-[170px] items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="relative">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-success-soft text-small font-bold text-success">
            {avatarInitial(displayName)}
          </span>
          {authMethod === "google" ? (
            <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-border bg-card text-[9px] font-extrabold">
              G
            </span>
          ) : null}
        </span>
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-small font-bold">{displayName}</span>
          <span className="block text-[12px] tabular-nums text-muted-foreground">{shortAddress(address)}</span>
        </span>
      </button>
      {open ? (
        <div className="absolute right-5 top-16 z-40 w-72 rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="px-2 py-2">
            <div className="font-bold">{displayName}</div>
            <div className="text-small text-muted-foreground">{methodLabel}</div>
            <div className="text-small tabular-nums">{shortAddress(address)}</div>
          </div>
          <button type="button" className="flex h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-small" onClick={copy}>
            <Copy className="h-4 w-4" /> Copy wallet address
          </button>
          <a
            className="flex h-11 w-full items-center gap-2 rounded-xl px-2 text-small"
            href={`https://suiscan.xyz/testnet/account/${address}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4" /> View on explorer
          </a>
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-small"
            onClick={() => router.push("/profile?edit=1")}
          >
            Edit profile
          </button>
          <hr className="my-1 border-border" />
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-small text-destructive"
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : null}
      {confirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/55 px-6">
          <div role="alertdialog" className="w-full max-w-sm rounded-[24px] bg-card p-6">
            <h2 className="text-h2 font-bold">Sign out of Kolo?</h2>
            <p className="mt-2 text-body text-muted-foreground">
              Your circles and money stay as they are. To get back in,{" "}
              {authMethod === "google" ? "continue with the same Google account." : "connect the same wallet."}
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-destructive text-[16px] font-bold text-destructive-foreground hover:scale-95"
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
              <button
                type="button"
                className="h-14 w-full rounded-2xl border-2 border-border bg-card text-[16px] font-bold hover:scale-95"
                onClick={() => setConfirm(false)}
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
