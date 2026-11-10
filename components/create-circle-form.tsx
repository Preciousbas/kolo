"use client";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildOpenTx } from "@/lib/circle-tx";

export function CreateCircleForm({
  displayName,
  packageId,
  coinType,
}: {
  displayName: string;
  packageId: string | null;
  coinType: string;
}) {
  const router = useRouter();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [name, setName] = useState("");
  const [naira, setNaira] = useState("20000");
  const [members, setMembers] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onCreate() {
    setError(null);
    if (!packageId) {
      setError("Package id is not set. Circles cannot be created on-chain yet.");
      return;
    }
    setBusy(true);
    try {
      const amount = Math.round((Number(naira) / 1492.5) * 1_000_000);
      const tx = buildOpenTx({
        maxMembers: members,
        amount,
        autoPayout: true,
        coinType,
        packageId,
      });
      const result = await signAndExecute({ transaction: tx });
      const id = (result as { effects?: { created?: { reference?: { objectId?: string } }[] } }).effects
        ?.created?.[0]?.reference?.objectId;
      const digest = result.digest;
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: id ?? digest,
          name,
          maxMembers: members,
          amount,
          autoPayout: true,
        }),
      });
      const data = (await res.json()) as { circle?: { id: string } };
      if (data.circle?.id) router.push(`/circles/${data.circle.id}`);
    } catch {
      setError("Couldn't create. Sign in your wallet to open the circle. No money moves yet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-background">
      <header className="flex h-14 items-center gap-3 px-5">
        <button type="button" className="grid h-11 w-11 place-items-center" onClick={() => router.back()} aria-label="Back">
          ←
        </button>
        <div>
          <div className="text-h3">New circle</div>
          <div className="text-small text-muted-foreground">Signed in as {displayName}</div>
        </div>
      </header>
      <div className="mx-5 grid grid-cols-2 rounded-2xl bg-secondary p-1 text-body font-bold">
        <div className="grid h-10 place-items-center rounded-xl bg-card">Start a circle</div>
        <button type="button" className="grid h-10 place-items-center rounded-xl text-muted-foreground" onClick={() => router.push("/join")}>
          Join with a code
        </button>
      </div>
      <div className="space-y-2.5 px-5 pt-3">
        <div>
          <Label htmlFor="circleName">Circle name</Label>
          <Input id="circleName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11 rounded-xl border-2 px-4 font-semibold" />
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <Label htmlFor="amount">Amount per person</Label>
            <Input id="amount" value={naira} onChange={(e) => setNaira(e.target.value)} className="mt-1.5 h-11 rounded-xl border-2 px-4 font-semibold" />
          </div>
          <div>
            <Label>Members</Label>
            <div className="mt-1.5 flex h-12 items-center justify-between rounded-xl border-2 border-border bg-card px-2">
              <button type="button" className="grid h-11 w-11 place-items-center rounded-lg bg-secondary" onClick={() => setMembers((n) => Math.max(3, n - 1))}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-h3 tabular-nums">{members}</span>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-lg bg-secondary" onClick={() => setMembers((n) => Math.min(6, n + 1))}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-small text-muted-foreground">
          One cycle of {members} monthly rounds — each member gets one payout. Monthly only.
        </p>
        {error ? <p className="text-small text-destructive">{error}</p> : null}
      </div>
      <div className="mt-auto border-t border-border/70 px-5 pb-7 pt-3">
        <Button disabled={busy || !name} className="h-14 w-full rounded-2xl text-[16px] font-bold" onClick={onCreate}>
          Create circle
        </Button>
      </div>
    </div>
  );
}
