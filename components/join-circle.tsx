"use client";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildJoinTx } from "@/lib/circle-tx";
import { PENDING_INVITE_KEY, parsePendingInvite, pendingInviteFromCode } from "@/lib/pending-invite";

type Preview = {
  ok: true;
  code: string;
  circle: { id: string; name: string; memberCount: number; maxMembers: number; amount: number };
  inviter: string | null;
};

export function JoinCircle({
  displayName,
  code,
  returning,
  packageId,
  coinType,
}: {
  displayName: string;
  code?: string;
  returning?: boolean;
  packageId: string | null;
  coinType: string;
}) {
  const router = useRouter();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [value, setValue] = useState(code ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    sessionStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(pendingInviteFromCode(code)));
    void load(code);
  }, [code]);

  async function load(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/join/${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setPreview(null);
      setReason(data.error ?? data.reason ?? "invalid");
      return;
    }
    setReason(null);
    setPreview(data as Preview);
  }

  async function join() {
    if (!preview || !packageId) return;
    setBusy(true);
    try {
      const tx = buildJoinTx({ circleId: preview.circle.id, coinType, packageId });
      await signAndExecute({ transaction: tx });
      await fetch(`/api/join/${encodeURIComponent(preview.code)}`, { method: "POST" });
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      router.push(`/circles/${preview.circle.id}`);
    } finally {
      setBusy(false);
    }
  }

  const pending = typeof window !== "undefined" ? parsePendingInvite(sessionStorage.getItem(PENDING_INVITE_KEY)) : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-background">
      <header className="flex h-14 items-center gap-3 px-5">
        <button type="button" className="grid h-11 w-11 place-items-center" onClick={() => router.back()} aria-label="Back">
          ←
        </button>
        <div>
          <div className="text-h3">Join a circle</div>
          <div className="text-small text-muted-foreground">Signed in as {displayName}</div>
        </div>
      </header>
      <div className="mx-5 grid grid-cols-2 rounded-2xl bg-secondary p-1 text-body font-bold">
        <button type="button" className="grid h-10 place-items-center rounded-xl text-muted-foreground" onClick={() => router.push("/circles/new")}>
          Start a circle
        </button>
        <div className="grid h-10 place-items-center rounded-xl bg-card">Join with a code</div>
      </div>
      <div className="space-y-4 px-5 pt-4">
        {returning ? (
          <div className="flex gap-2 rounded-xl bg-success-soft p-3 text-small font-semibold text-success">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
            You&apos;re signed in. Here&apos;s the invite you opened.
          </div>
        ) : null}
        <div>
          <Label htmlFor="code">Invite code or link</Label>
          <Input
            id="code"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => load(value)}
            className={`mt-1.5 h-12 rounded-xl border-2 px-4 font-semibold tracking-[0.18em] ${reason ? "border-destructive" : ""}`}
          />
          {preview ? (
            <p className="mt-1 text-small text-muted-foreground">
              From {preview.inviter ?? "a member"}&apos;s invite link. You&apos;ll join as <b>{displayName}</b>.
            </p>
          ) : null}
        </div>
        {reason ? (
          <>
            <p className="flex gap-1.5 text-small font-semibold text-destructive">
              <CircleAlert className="mt-0.5 h-4 w-4" />
              {reason === "this invite is for someone else" || reason === "this circle is full"
                ? reason
                : "We can't find a circle with that code. Check it with the person who sent it. Codes look like KOLO- and 4 letters or numbers."}
            </p>
            <div className="rounded-2xl bg-secondary p-4 text-small">
              <b>Opened an old link?</b>
              <p className="mt-1 text-muted-foreground">
                Invites stop working when a circle is full or the organiser turns the link off. Ask for a new one.
              </p>
            </div>
          </>
        ) : null}
        {preview ? (
          <section className="rounded-[20px] border border-border/60 bg-card p-4">
            <div className="text-micro uppercase text-muted-foreground">Preview · you haven&apos;t joined yet</div>
            <h2 className="mt-2 text-h1 font-bold">{preview.circle.name}</h2>
            <p className="mt-4 text-small font-bold">
              {preview.circle.memberCount} of {preview.circle.maxMembers} joined
            </p>
          </section>
        ) : null}
      </div>
      <div className="mt-auto space-y-2 border-t border-border/70 px-5 pb-7 pt-3">
        <Button disabled={!preview || busy} className="h-14 w-full rounded-2xl text-[16px] font-bold" onClick={join}>
          {preview ? `Join ${preview.circle.name}` : "Join"}
        </Button>
        <Button variant="ghost" className="h-11 w-full font-bold text-primary" onClick={() => router.push("/circles")}>
          Not now
        </Button>
      </div>
      {pending ? null : null}
    </div>
  );
}
