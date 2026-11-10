import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { MemoryClient } from "../lib/memory";

let tmp: string;

describe("getMemberTrust", () => {
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "kolo-trust-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    mkdirSync(path.join(tmp, "data"), { recursive: true });
    process.env.KOLO_MEMORY_MOCK = "1";
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
    delete process.env.KOLO_MEMORY_MOCK;
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
    vi.doUnmock("../lib/memory");
  });

  it("falls back to ledger when recall throws", async () => {
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
    vi.doUnmock("../lib/memory");
  });
});
