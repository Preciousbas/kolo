import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { consumeChallenge, issueChallenge, saveProfile, getProfile } from "../lib/auth-store";
import {
  addCircleMember,
  createInvite,
  getInvite,
  markCircleStarted,
  previewInvite,
  revokeInvite,
  saveStoredCircle,
  type StoredCircle,
} from "../lib/circle-registry";
import { resetNowMs, setNowMsForTests } from "../lib/clock";
import {
  decodeSession,
  encodeSession,
  sessionCookieOptions,
  WALLET_SESSION_MS,
} from "../lib/crypto-session";
import { resetKvForTests } from "../lib/kv";
import { parsePendingInvite, PENDING_INVITE_MS } from "../lib/pending-invite";
import {
  formValuesFromProfile,
  incompleteProfileRedirect,
  isProfileComplete,
  publicProfile,
  validateProfileInput,
} from "../lib/profile";
import { isPublicPath, afterAuthPath, signedOutDestination } from "../lib/route-guards";
import { verifySignInMessage } from "../lib/verify-signin";

const SECRET = "a".repeat(64);

beforeEach(() => {
  process.env.KOLO_SESSION_SECRET = SECRET;
  process.env.KOLO_KV = "memory";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  resetKvForTests();
  resetNowMs();
});

afterEach(() => {
  resetNowMs();
  resetKvForTests();
});

describe("challenge", () => {
  it("is single use and expires after 5 minutes", async () => {
    const address = "0x" + "11".repeat(32);
    const issued = await issueChallenge(address);
    const first = await consumeChallenge(issued.code, address);
    expect(first.ok).toBe(true);
    const second = await consumeChallenge(issued.code, address);
    expect(second.ok).toBe(false);

    const issued2 = await issueChallenge(address);
    setNowMsForTests(() => Date.now() + 6 * 60 * 1000);
    const expired = await consumeChallenge(issued2.code, address);
    expect(expired.ok).toBe(false);
  });
});

describe("signature verify", () => {
  it("accepts a matching Ed25519 signature and rejects a bad one", async () => {
    const keypair = Ed25519Keypair.generate();
    const address = keypair.getPublicKey().toSuiAddress();
    const message = `Sign in to Kolo\nAddress: ${address}\nDate: 2026-11-04\nCode: abc`;
    const { signature } = await keypair.signPersonalMessage(new TextEncoder().encode(message));
    expect(await verifySignInMessage({ message, signature, address })).toBe(true);
    expect(await verifySignInMessage({ message: message + "x", signature, address })).toBe(false);
  });
});

describe("session cookie", () => {
  it("sets httpOnly, SameSite=Lax, and Secure in production", async () => {
    const flags = sessionCookieOptions({ production: true, maxAgeMs: WALLET_SESSION_MS });
    expect(flags.httpOnly).toBe(true);
    expect(flags.sameSite).toBe("lax");
    expect(flags.secure).toBe(true);
    const token = await encodeSession({
      address: "0xabc",
      authMethod: "wallet",
      exp: Date.now() + 1000,
    });
    expect((await decodeSession(token))?.address).toBe("0xabc");
    expect(await decodeSession(token + "tampered")).toBeNull();
  });
});

describe("profile validation", () => {
  it("validates names, display name, and username", () => {
    const bad = validateProfileInput({
      firstName: "",
      lastName: "Eze!!",
      displayName: "N",
      username: "AB",
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) throw new Error("expected errors");
    expect(bad.errors.map((e) => e.field).sort()).toEqual(["displayName", "firstName", "lastName", "username"]);

    const good = validateProfileInput({
      firstName: "Ngozi",
      lastName: "Eze",
      displayName: "Ngozi E.",
      username: "ngozi_e",
    });
    expect(good.ok).toBe(true);
  });

  it("never puts first or last name on the public profile", async () => {
    const profile = {
      firstName: "Ngozi",
      lastName: "Eze",
      displayName: "Ngozi E.",
      username: "ngozi_e",
      address: "0x" + "22".repeat(32),
      authMethod: "wallet" as const,
      createdAt: new Date().toISOString(),
    };
    await saveProfile(profile);
    const stored = await getProfile(profile.address);
    const pub = publicProfile(stored!);
    const json = JSON.stringify(pub);
    expect(json).not.toContain("Eze");
    expect(json).not.toContain("firstName");
    expect(json).not.toContain("lastName");
  });
});

describe("pending invite", () => {
  it("expires after 30 minutes", () => {
    const savedAt = new Date(Date.now() - PENDING_INVITE_MS - 1).toISOString();
    expect(
      parsePendingInvite(JSON.stringify({ code: "KOLO-TESTCODE", returnTo: "/join/KOLO-TESTCODE", savedAt })),
    ).toBeNull();
    const fresh = parsePendingInvite(
      JSON.stringify({
        code: "KOLO-TESTCODE",
        returnTo: "/join/KOLO-TESTCODE",
        savedAt: new Date().toISOString(),
      }),
    );
    expect(fresh?.code).toBe("KOLO-TESTCODE");
  });
});

const completeProfile = {
  firstName: "Ngozi",
  lastName: "Eze",
  displayName: "Ngozi E.",
  username: "ngozi_e",
  address: "0x" + "22".repeat(32),
  authMethod: "wallet" as const,
  createdAt: new Date().toISOString(),
};

describe("route guards", () => {
  it("sends signed-out users to 00", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/circles")).toBe(true);
    expect(isPublicPath("/og-image.png")).toBe(true);
    expect(isPublicPath("/icon-192.png")).toBe(true);
    expect(signedOutDestination("/circles")).toBe("/?returnTo=%2Fcircles");
    expect(afterAuthPath({ hasProfile: false, circleCount: 0 })).toBe("/profile");
    expect(afterAuthPath({ hasProfile: true, circleCount: 1 })).toBe("/circles");
    expect(afterAuthPath({ hasProfile: true, pendingInvite: "/join/KOLO-1", circleCount: 0 })).toBe("/join/KOLO-1");
  });

  it("complete profile visiting /circles/new does not redirect to /profile", () => {
    // requireUser (used by app/circles/new/page.tsx) uses incompleteProfileRedirect.
    expect(incompleteProfileRedirect(completeProfile)).toBeNull();
    expect(afterAuthPath({ hasProfile: isProfileComplete(completeProfile), circleCount: 0 })).toBe("/circles/new");
  });

  it("missing username is treated as incomplete", () => {
    expect(isProfileComplete({ ...completeProfile, username: "" })).toBe(false);
    expect(incompleteProfileRedirect({ ...completeProfile, username: "" })).toBe("/profile");
    expect(isProfileComplete({ ...completeProfile, username: "AB" })).toBe(false);
  });

  it("form prefills from existing profile", () => {
    expect(formValuesFromProfile(completeProfile)).toEqual({
      firstName: "Ngozi",
      lastName: "Eze",
      displayName: "Ngozi E.",
      username: "ngozi_e",
    });
  });

  it("profile get/save uses the same lowercased address key", async () => {
    const mixed = ("0x" + "Cd".repeat(32)) as string;
    await saveProfile({ ...completeProfile, address: mixed, username: "case_ok" });
    const lower = await getProfile(mixed.toLowerCase());
    const upper = await getProfile(mixed.toUpperCase());
    expect(isProfileComplete(lower)).toBe(true);
    expect(isProfileComplete(upper)).toBe(true);
    expect(incompleteProfileRedirect(lower)).toBeNull();
    expect(lower?.address).toBe(mixed.toLowerCase());
  });
});

function circleFixture(over: Partial<StoredCircle> = {}): StoredCircle {
  return {
    id: "0xcircle1",
    name: "Balogun Street Ajo",
    creator: "0x" + "aa".repeat(32),
    members: ["0x" + "aa".repeat(32)],
    maxMembers: 3,
    amount: 20_000_000,
    autoPayout: true,
    started: false,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("invites", () => {
  it("rejects a direct invite for the wrong user", async () => {
    const creator = "0x" + "aa".repeat(32);
    const invited = "0x" + "bb".repeat(32);
    const other = "0x" + "cc".repeat(32);
    await saveProfile({
      firstName: "Ada",
      lastName: "O",
      displayName: "Ada",
      username: "ada_o",
      address: invited,
      authMethod: "wallet",
      createdAt: new Date().toISOString(),
    });
    const circle = circleFixture({ creator, members: [creator] });
    await saveStoredCircle(circle);
    const made = await createInvite({ circle, actor: creator, kind: "direct", username: "ada_o" });
    expect(made.ok).toBe(true);
    if (!made.ok) throw new Error("invite");
    const wrong = await previewInvite(made.invite.code, other);
    expect(wrong.ok).toBe(false);
    if (wrong.ok) throw new Error("expected wrong_user");
    expect(wrong.reason).toBe("wrong_user");
  });

  it("stops a general link after the circle is full", async () => {
    const creator = "0x" + "aa".repeat(32);
    const circle = circleFixture({ creator, members: [creator], maxMembers: 3 });
    await saveStoredCircle(circle);
    const made = await createInvite({ circle, actor: creator, kind: "general" });
    expect(made.ok).toBe(true);
    if (!made.ok) throw new Error("invite");
    await addCircleMember(circle.id, "0x" + "b1".repeat(32));
    await addCircleMember(circle.id, "0x" + "b2".repeat(32));
    const full = await previewInvite(made.invite.code, "0x" + "b3".repeat(32));
    expect(full.ok).toBe(false);
    if (full.ok) throw new Error("expected full");
    expect(full.reason).toBe("full");
  });

  it("rejects a revoked link", async () => {
    const creator = "0x" + "aa".repeat(32);
    const circle = circleFixture({ creator, members: [creator] });
    await saveStoredCircle(circle);
    const made = await createInvite({ circle, actor: creator, kind: "general" });
    expect(made.ok).toBe(true);
    if (!made.ok) throw new Error("invite");
    await revokeInvite(made.invite.code, creator);
    const preview = await previewInvite(made.invite.code, "0x" + "dd".repeat(32));
    expect(preview.ok).toBe(false);
    if (preview.ok) throw new Error("expected revoked");
    expect(preview.reason).toBe("revoked");
    expect((await getInvite(made.invite.code))?.status).toBe("revoked");
  });

  it("invalidates invites after start", async () => {
    const creator = "0x" + "aa".repeat(32);
    const circle = circleFixture({
      creator,
      maxMembers: 6,
      members: [creator, "0x" + "b1".repeat(32), "0x" + "b2".repeat(32)],
    });
    await saveStoredCircle(circle);
    const made = await createInvite({ circle, actor: creator, kind: "general" });
    expect(made.ok).toBe(true);
    if (!made.ok) throw new Error("invite");
    await markCircleStarted(circle.id);
    const preview = await previewInvite(made.invite.code, "0x" + "ee".repeat(32));
    expect(preview.ok).toBe(false);
    if (preview.ok) throw new Error("expected started");
    expect(preview.reason).toBe("started");
  });

  it("does not let a non-member fetch invites", async () => {
    const creator = "0x" + "aa".repeat(32);
    const stranger = "0x" + "ff".repeat(32);
    const circle = circleFixture({ creator, members: [creator] });
    const made = await createInvite({ circle, actor: stranger, kind: "general" });
    expect(made.ok).toBe(false);
  });
});
