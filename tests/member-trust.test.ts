import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, copyFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { MemoryClient } from "../lib/memory";

let tmp: string;
const root = path.resolve(__dirname, "..");

describe("getMemberTrust", () => {
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "kolo-trust-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    mkdirSync(path.join(tmp, "data"), { recursive: true });
    process.env.KOLO_MEMORY_MOCK = "1";
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    delete process.env.KOLO_MEMORY_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.KOLO_MEMORY_MOCK;
    delete process.env.KOLO_MEMORY_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
  });

  it("builds trust from mock recall hits and dedupes digests", async () => {
    const circleId = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const member = "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    const mem = {
      v: 1,
      app: "kolo",
      kind: "paid",
      circleId,
      round: 1,
      member,
      timing: "on_time",
      amountRaw: "1",
      coinType: "0x2::usdc::USDC",
      decimals: 6,
      at: "2026-11-01T00:00:00.000Z",
      txDigest: "dup-digest",
      escrowNetwork: "testnet",
    };
    const text = `Kolo: member 0xdd..dd paid round 1 of circle 0xcc..cc on time. ${JSON.stringify(mem)}`;

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
          recall: async () => ({
            results: [
              { text, blob_id: "blob-1" },
              { text, blob_id: "blob-1" },
            ],
          }),
        }),
      };
    });

    const { getMemberTrust } = await import("../lib/member-trust");
    const trust = await getMemberTrust(circleId, member, { memberLabel: "Member" });
    expect(trust.source).toBe("memory");
    expect(trust.onTime).toBe(1);
    expect(trust.rounds).toHaveLength(1);
    expect(trust.blobIds).toEqual(["blob-1"]);
    expect(trust.network).not.toBe("mock");
    vi.doUnmock("../lib/memory");
  });

  it("falls back to ledger when recall throws and saved index is empty", async () => {
    const circleId = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const member = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    writeFileSync(
      path.join(tmp, "data/memory-ledger.mock.json"),
      JSON.stringify([
        {
          key: "d1:paid:member",
          circleId,
          round: 2,
          member,
          kind: "paid",
          timing: "late",
          txDigest: "d1",
          blobId: "blob-ledger",
          memoryId: "m1",
          network: "mock",
          writtenAt: "2026-11-01T00:00:00.000Z",
          points: 5,
          link: "https://walruscan.com/testnet/blob/blob-ledger",
        },
      ]),
      "utf8",
    );

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
          recall: async () => {
            throw new Error("recall down");
          },
        }),
      };
    });

    const { getMemberTrust } = await import("../lib/member-trust");
    const trust = await getMemberTrust(circleId, member, { memberLabel: "Femi" });
    expect(trust.source).toBe("ledger");
    expect(trust.late).toBe(1);
    expect(trust.nudge).toMatch(/late once/i);
    expect(trust.network).not.toBe("mock");
    vi.doUnmock("../lib/memory");
  });

  it("falls back to saved mainnet index when recall times out", async () => {
    process.env.KOLO_MEMORY_NETWORK = "mainnet";
    process.env.KOLO_ALLOW_MAINNET_MEMORY = "yes";
    delete process.env.KOLO_MEMORY_MOCK;

    const indexPath = path.join(root, "data/memories.mainnet.json");
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      circleId: string;
      count: number;
      memories: Array<{ member: string; link: string; blobId: string }>;
    };
    copyFileSync(indexPath, path.join(tmp, "data/memories.mainnet.json"));

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

    const { getMemberTrust } = await import("../lib/member-trust");
    const members = [...new Set(index.memories.map((m) => m.member))];
    const trusts = await Promise.all(
      members.map((member) =>
        getMemberTrust(index.circleId, member, {
          memberLabel: "Member",
          recallTimeoutMs: 40,
        }),
      ),
    );

    const links = trusts.flatMap((t) =>
      t.rounds.map((r) => r.link).filter((l): l is string => Boolean(l)),
    );
    expect(links).toHaveLength(index.count);
    expect(index.count).toBe(18);
    expect(links.every((l) => l.includes("walruscan.com/mainnet/blob/"))).toBe(true);
    expect(trusts.every((t) => t.source === "memory (saved index)")).toBe(true);
    expect(trusts.every((t) => t.network === "mainnet")).toBe(true);
    expect(JSON.stringify(trusts).toLowerCase()).not.toMatch(/mock/);
    vi.doUnmock("../lib/memory");
  });
});
