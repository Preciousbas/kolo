"use client";

import { CircleCheck, Eye, Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PENDING_INVITE_KEY, parsePendingInvite } from "@/lib/pending-invite";
import {
  avatarInitial,
  displayPreview,
  formValuesFromProfile,
  isProfileComplete,
  shortAddress,
  validateDisplayName,
  validateName,
  validateUsername,
  type FieldError,
} from "@/lib/profile";
import { afterAuthPath } from "@/lib/route-guards";

type Props = {
  address: string;
  authMethod: "wallet" | "google";
  walletName?: string;
  initial?: {
    firstName: string;
    lastName: string;
    displayName: string;
    username: string;
  } | null;
};

export function ProfileForm({ address, authMethod, walletName, initial }: Props) {
  const router = useRouter();
  const seed = formValuesFromProfile(initial);
  const [firstName, setFirstName] = useState(seed.firstName);
  const [lastName, setLastName] = useState(seed.lastName);
  const [displayName, setDisplayName] = useState(seed.displayName);
  const [username, setUsername] = useState(seed.username);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const firstRef = useRef<HTMLInputElement>(null);
  const lastRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLInputElement>(null);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fromProps = formValuesFromProfile(initial);
    if (fromProps.firstName || fromProps.lastName || fromProps.displayName || fromProps.username) {
      setFirstName(fromProps.firstName);
      setLastName(fromProps.lastName);
      setDisplayName(fromProps.displayName);
      setUsername(fromProps.username);
    }
    let cancelled = false;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((me: { profile?: typeof initial }) => {
        if (cancelled || !me.profile) return;
        const fromMe = formValuesFromProfile(me.profile);
        setFirstName(fromMe.firstName);
        setLastName(fromMe.lastName);
        setDisplayName(fromMe.displayName);
        setUsername(fromMe.username);
      })
      .catch(() => {
        /* keep current fields */
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  function revalidate(next: { firstName: string; lastName: string; displayName: string; username: string }) {
    const nextErrors: FieldError[] = [];
    const first = validateName(next.firstName, "first");
    if (first && (touched.firstName || next.firstName)) nextErrors.push({ field: "firstName", message: first });
    const last = validateName(next.lastName, "last");
    if (last && (touched.lastName || next.lastName)) nextErrors.push({ field: "lastName", message: last });
    const display = validateDisplayName(next.displayName);
    if (display && (touched.displayName || next.displayName)) nextErrors.push({ field: "displayName", message: display });
    const user = validateUsername(next.username);
    if (user && (touched.username || next.username)) nextErrors.push({ field: "username", message: user });
    setErrors(nextErrors);
    return nextErrors;
  }

  const canSubmit = useMemo(() => {
    return (
      !validateName(firstName, "first") &&
      !validateName(lastName, "last") &&
      !validateDisplayName(displayName) &&
      !validateUsername(username)
    );
  }, [firstName, lastName, displayName, username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, displayName: true, username: true });
    const all = [
      validateName(firstName, "first") && { field: "firstName", message: validateName(firstName, "first")! },
      validateName(lastName, "last") && { field: "lastName", message: validateName(lastName, "last")! },
      validateDisplayName(displayName) && { field: "displayName", message: validateDisplayName(displayName)! },
      validateUsername(username) && { field: "username", message: validateUsername(username)! },
    ].filter(Boolean) as FieldError[];
    setErrors(all);
    if (all.length) {
      const first = all[0]?.field;
      if (first === "firstName") firstRef.current?.focus();
      if (first === "lastName") lastRef.current?.focus();
      if (first === "displayName") displayRef.current?.focus();
      if (first === "username") userRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, displayName, username }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { errors?: FieldError[]; error?: string };
        setErrors(data.errors ?? []);
        return;
      }
      const saved = (await res.json()) as { profile?: typeof initial };
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
      const fresh = me.profile ?? saved.profile;
      if (fresh) {
        const fromMe = formValuesFromProfile(fresh);
        setFirstName(fromMe.firstName);
        setLastName(fromMe.lastName);
        setDisplayName(fromMe.displayName);
        setUsername(fromMe.username);
      }
      // Navigate only on fresh complete data — never on a stale hasProfile flag.
      if (!isProfileComplete(fresh)) {
        setErrors([{ field: "form", message: "Couldn't save. Check your connection and try again." }]);
        return;
      }
      const pending = parsePendingInvite(sessionStorage.getItem(PENDING_INVITE_KEY));
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const next = afterAuthPath({
        hasProfile: true,
        pendingInvite: pending?.returnTo ?? (returnTo?.startsWith("/") ? returnTo : null),
        circleCount: typeof me.circleCount === "number" ? me.circleCount : 0,
      });
      router.push(next);
      router.refresh();
    } catch {
      setErrors([{ field: "form", message: "Couldn't save. Check your connection and try again." }]);
    } finally {
      setSaving(false);
    }
  }

  const banner = errors.length
    ? `Fix ${errors.length} thing${errors.length === 1 ? "" : "s"} to continue.`
    : null;

  return (
    <form onSubmit={onSubmit} className={`mx-auto flex min-h-screen max-w-xl flex-col bg-background ${saving ? "pointer-events-none opacity-60" : ""}`}>
      <header className="flex h-14 items-center gap-3 px-5">
        <div>
          <div className="text-h3">About you</div>
          <div className="text-small text-muted-foreground">Step 1 of 1 · takes 20 seconds</div>
        </div>
      </header>
      <div className="space-y-4 px-5 pt-2">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-card">
            <Wallet className="h-5 w-5 text-primary" />
          </span>
          <div className="flex-1 text-small">
            <b>{authMethod === "google" ? "Signed in with Google" : `Connected with ${walletName ?? "wallet"}`}</b>
            <br />
            <span className="text-muted-foreground">
              {authMethod === "google" ? "Your Kolo wallet is ready" : "Wallet"} · {shortAddress(address)}
            </span>
          </div>
          <CircleCheck className="h-5 w-5 text-success" />
        </div>
        <p className="text-body text-muted-foreground">
          Tell your circle who you are. We don&apos;t copy anything from Google, so type it how you want it.
        </p>
        {banner ? (
          <p role="alert" className="text-small font-semibold text-destructive">
            {banner}
          </p>
        ) : null}
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            ref={firstRef}
            id="firstName"
            value={firstName}
            autoFocus
            disabled={saving}
            aria-invalid={Boolean(fieldError("firstName"))}
            aria-describedby={fieldError("firstName") ? "firstName-error" : undefined}
            placeholder="e.g. Ngozi"
            className="mt-1.5 h-12 rounded-xl border-2 px-4 text-body font-semibold"
            onBlur={() => {
              setTouched((t) => ({ ...t, firstName: true }));
              revalidate({ firstName, lastName, displayName, username });
            }}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (touched.firstName) revalidate({ firstName: e.target.value, lastName, displayName, username });
            }}
          />
          {fieldError("firstName") ? (
            <p id="firstName-error" className="mt-1 text-small text-destructive">
              {fieldError("firstName")}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            ref={lastRef}
            id="lastName"
            value={lastName}
            disabled={saving}
            aria-invalid={Boolean(fieldError("lastName"))}
            aria-describedby={fieldError("lastName") ? "lastName-error" : undefined}
            placeholder="e.g. Eze"
            className="mt-1.5 h-12 rounded-xl border-2 px-4 text-body font-semibold"
            onBlur={() => {
              setTouched((t) => ({ ...t, lastName: true }));
              revalidate({ firstName, lastName, displayName, username });
            }}
            onChange={(e) => {
              setLastName(e.target.value);
              if (touched.lastName) revalidate({ firstName, lastName: e.target.value, displayName, username });
            }}
          />
          {fieldError("lastName") ? (
            <p id="lastName-error" className="mt-1 text-small text-destructive">
              {fieldError("lastName")}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="displayName">Display name</Label>
          <Input
            ref={displayRef}
            id="displayName"
            value={displayName}
            disabled={saving}
            aria-invalid={Boolean(fieldError("displayName"))}
            aria-describedby={fieldError("displayName") ? "displayName-error" : undefined}
            placeholder="e.g. Ngozi E."
            className="mt-1.5 h-12 rounded-xl border-2 px-4 text-body font-semibold"
            onBlur={() => {
              setTouched((t) => ({ ...t, displayName: true }));
              revalidate({ firstName, lastName, displayName, username });
            }}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (touched.displayName) revalidate({ firstName, lastName, displayName: e.target.value, username });
            }}
          />
          <p className="mt-1 text-small text-muted-foreground">Members of your circles see this. 2 to 24 characters.</p>
          {fieldError("displayName") ? (
            <p id="displayName-error" className="mt-1 text-small text-destructive">
              {fieldError("displayName")}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            ref={userRef}
            id="username"
            value={username}
            disabled={saving}
            aria-invalid={Boolean(fieldError("username"))}
            aria-describedby={fieldError("username") ? "username-error" : undefined}
            placeholder="e.g. ngozi_e"
            className="mt-1.5 h-12 rounded-xl border-2 px-4 text-body font-semibold"
            onBlur={() => {
              setTouched((t) => ({ ...t, username: true }));
              revalidate({ firstName, lastName, displayName, username });
            }}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              if (touched.username) revalidate({ firstName, lastName, displayName, username: e.target.value });
            }}
          />
          <p className="mt-1 text-small text-muted-foreground">3 to 20 lowercase letters, numbers or underscore. Used for direct invites.</p>
          {fieldError("username") ? (
            <p id="username-error" className="mt-1 text-small text-destructive">
              {fieldError("username")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-small text-muted-foreground">
          <Eye className="h-4 w-4" />
          Circle members will see:{" "}
          <span className="grid h-6 w-6 place-items-center rounded-full bg-success-soft text-[11px] font-bold text-success">
            {avatarInitial(displayName)}
          </span>
          <b className="text-foreground">{displayPreview(displayName)}</b>
        </div>
      </div>
      <div className="mt-auto border-t border-border/70 bg-background px-5 pb-7 pt-3">
        <Button
          type="submit"
          disabled={!canSubmit || saving}
          className="h-14 w-full rounded-2xl text-[16px] font-bold disabled:bg-primary/60"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </form>
  );
}
