"use client";

import { useEffect, useState } from "react";
import { InviteTrustLine, type InviteTrustView } from "@/components/invite-trust-line";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LookupResponse = {
  found: boolean;
  username: string;
  address?: string;
  trust: InviteTrustView | null;
  error?: string;
};

export function InviteByUsername({ circleId }: { circleId: string }) {
  const [username, setUsername] = useState("");
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setLookup(null);
      setError(null);
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        setBusy(true);
        setError(null);
        try {
          const res = await fetch(
            `/api/circles/${encodeURIComponent(circleId)}/invites/lookup?username=${encodeURIComponent(trimmed)}`,
          );
          const data = (await res.json()) as LookupResponse & { error?: string };
          if (res.status === 403) {
            setLookup(null);
            setError("Only the circle creator can invite by username.");
            return;
          }
          if (!res.ok) {
            setLookup(null);
            setError(data.error ?? "Could not look up that username.");
            return;
          }
          setLookup(data);
        } catch {
          setLookup(null);
          setError("Could not look up that username.");
        } finally {
          setBusy(false);
        }
      })();
    }, 350);
    return () => clearTimeout(handle);
  }, [username, circleId]);

  async function sendInvite() {
    if (!lookup?.found) return;
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/circles/${encodeURIComponent(circleId)}/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "direct", username: lookup.username }),
      });
      const data = (await res.json()) as { invite?: { code: string }; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send invite.");
        return;
      }
      setMessage(`Invite sent to @${lookup.username}.`);
      setUsername("");
      setLookup(null);
    } catch {
      setError("Could not send invite.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <Label htmlFor="invite-username">Invite by username</Label>
        <Input
          id="invite-username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="e.g. ada_o"
          className="mt-1.5 h-11 rounded-xl border-2 px-4 font-semibold"
          autoComplete="off"
        />
        {busy ? (
          <p className="mt-1 text-small text-muted-foreground">Looking up…</p>
        ) : null}
      </div>
      {lookup && !lookup.found ? (
        <p className="text-small text-muted-foreground">No Kolo user with that username.</p>
      ) : null}
      {lookup?.found && lookup.trust ? <InviteTrustLine trust={lookup.trust} /> : null}
      {error ? <p className="text-small font-semibold text-destructive">{error}</p> : null}
      {message ? <p className="text-small font-semibold text-success">{message}</p> : null}
      <Button
        disabled={!lookup?.found || sending}
        className="h-11 w-full rounded-xl font-bold"
        onClick={sendInvite}
      >
        {sending ? "Sending…" : "Send invite"}
      </Button>
    </section>
  );
}
