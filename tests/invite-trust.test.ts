import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { type StoredCircle } from "../lib/circle-registry";
import { resetKvForTests } from "../lib/kv";
import type { MemoryClient } from "../lib/memory";

const root = path.resolve(__dirname, "..");
const SECRET = "a".repeat(64);

function circleFixture(over: Partial<StoredCircle> = {}): StoredCircle {
  return {
    id: "0x" + "c1".repeat(32),
    name: "Test circle",
    creator: "0x" + "aa".repeat(32),
    members: ["0x" + "aa".repeat(32)],
    maxMembers: 6,
    amount: 20_000_000,
    autoPayout: true,
    started: false,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("invite trust summary", () => {
  let tmp: string;

  beforeEach(() => {
    process.env.KOLO_SESSION_SECRET = SECRET;
    process.env.KOLO_KV = "memory";
    process.env.KOLO_MEMORY_MOCK = "1";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    delete process.env.KOLO_MEMORY_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
    resetKvForTests();
    tmp = mkdtempSync(path.join(os.tmpdir(), "kolo-invite-trust-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    mkdirSync(path.join(tmp, "data"), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(tmp, { recursive: true, force: true });
    resetKvForTests();
    delete process.env.KOLO_MEMORY_MOCK;
    delete process.env.KOLO_MEMORY_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
  });

  it("shows counts for a wallet with saved mainnet memories", async () => {
    const indexPath = path.join(root, "data/memories.mainnet.json");
    copyFileSync(indexPath, path.join(tmp, "data/memories.mainnet.json"));
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      memories: Array<{ member: string; kind: string; timing: string | null }>;
    };
    const member = index.memories[0]!.member;
    const paid = index.memories.filter(
      (m) => m.member.toLowerCase() === member.toLowerCase() && m.kind === "paid",
    );
    const onTime = paid.filter((m) => m.timing === "on_time").length;

    const { getAddressTrustSummary, formatInviteTrustLine } = await import("../lib/member-trust");
    const summary = await getAddressTrustSummary(member, { recallTimeoutMs: 40 });
    expect(summary.hasRecord).toBe(true);
    expect(summary.onTime).toBe(onTime);
    expect(summary.blobLink).toMatch(/walruscan\.com\/mainnet\/blob\//);
    expect(summary.line).toBe(
      formatInviteTrustLine({
        onTime: summary.onTime,
        late: summary.late,
        hasRecord: true,
        blobLink: summary.blobLink,
      }),
    );
    expect(summary.line).toMatch(/Paid on time/);
    expect(summary.line.toLowerCase()).not.toMatch(/mock/);
  });

  it("shows no record yet for a new wallet", async () => {
    const { getAddressTrustSummary } = await import("../lib/member-trust");
    const summary = await getAddressTrustSummary(
      "0x" + "11".repeat(32),
      { recallTimeoutMs: 40 },
    );
    expect(summary.hasRecord).toBe(false);
    expect(summary.line).toBe("New to Kolo, no record yet");
    expect(summary.blobLink).toBeNull();
  });

  it("uses the saved-index fallback when live recall times out", async () => {
    process.env.KOLO_MEMORY_NETWORK = "mainnet";
    process.env.KOLO_ALLOW_MAINNET_MEMORY = "yes";
    delete process.env.KOLO_MEMORY_MOCK;

    const indexPath = path.join(root, "data/memories.mainnet.json");
    copyFileSync(indexPath, path.join(tmp, "data/memories.mainnet.json"));
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      circleId: string;
      memories: Array<{ member: string }>;
    };
    const member = index.memories[0]!.member;

    vi.doMock("../lib/memory", async () => {
      const actual = await vi.importActual<typeof import("../lib/memory")>("../lib/memory");
      return {
        ...actual,
        getMemory: async (): Promise<MemoryClient> => ({
          rememberAndWait: async () => ({
            id: "1",
            blob_id: "b",
            owner: "o",
            namespace: "n",
          }),
          recall: async () =>
            new Promise(() => {
              /* hang until timeout */
            }),
        }),
      };
    });

    const { getAddressTrustSummary } = await import("../lib/member-trust");
    const summary = await getAddressTrustSummary(member, { recallTimeoutMs: 40 });
    expect(summary.hasRecord).toBe(true);
    expect(summary.source).toBe("memory (saved index)");
    expect(summary.blobLink).toMatch(/walruscan\.com\/mainnet/);
    expect(JSON.stringify(summary).toLowerCase()).not.toMatch(/mock/);
    vi.doUnmock("../lib/memory");
  });
});

describe("invite trust lookup route", () => {
  beforeEach(() => {
    process.env.KOLO_SESSION_SECRET = SECRET;
    process.env.KOLO_KV = "memory";
    process.env.KOLO_MEMORY_MOCK = "1";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetKvForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    resetKvForTests();
    delete process.env.KOLO_MEMORY_MOCK;
  });

  it("returns 403 for a non-creator", async () => {
    vi.resetModules();
    const creator = "0x" + "aa".repeat(32);
    const member = "0x" + "bb".repeat(32);
    const circle = circleFixture({
      creator,
      members: [creator, member],
    });

    const { resetKvForTests: resetKv } = await import("../lib/kv");
    resetKv();
    const { saveStoredCircle: saveCircle } = await import("../lib/circle-registry");
    const { saveProfile: saveUser } = await import("../lib/auth-store");
    await saveCircle(circle);
    await saveUser({
      firstName: "Ada",
      lastName: "O",
      displayName: "Ada",
      username: "ada_o",
      address: "0x" + "cc".repeat(32),
      authMethod: "wallet",
      createdAt: new Date().toISOString(),
    });

    vi.doMock("../lib/request-session", () => ({
      getRequestSession: async () => ({
        address: member,
        authMethod: "wallet" as const,
        exp: Date.now() + 60_000,
      }),
      jsonError: (message: string, status: number) => Response.json({ error: message }, { status }),
    }));

    const { GET } = await import("../app/api/circles/[id]/invites/lookup/route");
    const res = await GET(
      new Request(`http://localhost/api/circles/${circle.id}/invites/lookup?username=ada_o`),
      { params: Promise.resolve({ id: circle.id }) },
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
    vi.doUnmock("../lib/request-session");
  });
});
