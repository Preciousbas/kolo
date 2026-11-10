import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { KoloEvent } from "../lib/feed";
import type { MemoryClient } from "../lib/memory";

const ENV_KEYS = [
  "KOLO_MEMORY_NETWORK",
  "KOLO_ALLOW_MAINNET_MEMORY",
  "KOLO_MEMORY_MAX_TOTAL",
  "KOLO_MEMORY_MAX_PER_RUN",
  "KOLO_MEMORY_MOCK",
  "MEMWAL_PRIVATE_KEY",
  "MEMWAL_ACCOUNT_ID",
  "KOLO_NETWORK",
  "KOLO_ALLOW_MAINNET",
] as const;

let tmp: string;
const snapshot = new Map<string, string | undefined>();

function saveEnv() {
  snapshot.clear();
  for (const key of ENV_KEYS) snapshot.set(key, process.env[key]);
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = snapshot.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const event: KoloEvent = {
  kind: "contributed",
  circleId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  round: 1,
  member: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  amountRaw: "20000000",
  coinType: "0x2::usdc::USDC",
  decimals: 6,
  roundComplete: false,
  txDigest: "tx-writer-1",
  checkpoint: "1",
  timestampMs: 1_700_000_000_000,
  explorerUrl: "",
  via: "graphql",
};

describe("memory writer", () => {
  beforeEach(() => {
    saveEnv();
    tmp = mkdtempSync(path.join(os.tmpdir(), "kolo-mem-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    process.env.KOLO_MEMORY_MOCK = "1";
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    process.env.KOLO_MEMORY_MAX_TOTAL = "5";
    process.env.KOLO_MEMORY_MAX_PER_RUN = "2";
  });

  afterEach(async () => {
    const { resetWriterRunState } = await import("../lib/memory-writer");
    resetWriterRunState();
    restoreEnv();
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("is idempotent and writes ledger row with blobId + link", async () => {
    const { writeMemory, resetWriterRunState, readLedger } = await import(
      "../lib/memory-writer"
    );
    resetWriterRunState();
    const client: MemoryClient = {
      rememberAndWait: vi.fn(async () => ({
        id: "mem-1",
        job_id: "job-1",
        blob_id: "blob-abc",
        owner: "0xowner",
        namespace: "kolo:x",
      })),
      recall: vi.fn(async () => ({ results: [] })),
    };

    const first = await writeMemory(event, { client });
    const second = await writeMemory(event, { client });
    expect(first.status).toBe("written");
    expect(second.status).toBe("skipped");
    if (second.status === "skipped") expect(second.reason).toBe("duplicate");
    expect(client.rememberAndWait).toHaveBeenCalledTimes(1);

    const ledger = readLedger("mock");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].blobId).toBe("blob-abc");
    expect(ledger[0].link).toContain("/blob/blob-abc");
    expect(JSON.stringify(ledger)).not.toContain("test-memwal-key-123");
  });

  it("enforces per-run and total caps", async () => {
    const { writeMemory, resetWriterRunState } = await import("../lib/memory-writer");
    resetWriterRunState();
    process.env.KOLO_MEMORY_MAX_PER_RUN = "1";
    process.env.KOLO_MEMORY_MAX_TOTAL = "1";

    let n = 0;
    const client: MemoryClient = {
      rememberAndWait: vi.fn(async () => {
        n += 1;
        return {
          id: `mem-${n}`,
          job_id: `job-${n}`,
          blob_id: `blob-${n}`,
          owner: "0xowner",
          namespace: "kolo:x",
        };
      }),
      recall: vi.fn(async () => ({ results: [] })),
    };

    const a = await writeMemory(event, { client });
    const b = await writeMemory(
      { ...event, txDigest: "tx-writer-2", member: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" },
      { client },
    );
    expect(a.status).toBe("written");
    expect(b.status).toBe("skipped");
    if (b.status === "skipped") {
      expect(["cap_run", "cap_total"]).toContain(b.reason);
    }
  });

  it("stops cleanly on 429", async () => {
    const { writeMemory, resetWriterRunState } = await import("../lib/memory-writer");
    resetWriterRunState();
    const err = Object.assign(new Error("rate limited 429"), { status: 429 });
    const client: MemoryClient = {
      rememberAndWait: vi.fn(async () => {
        throw err;
      }),
      recall: vi.fn(async () => ({ results: [] })),
    };
    const result = await writeMemory(
      { ...event, txDigest: "tx-429" },
      { client },
    );
    expect(result.status).toBe("rate_limited");
  });

  it("does not leak fake keys into cost log", async () => {
    process.env.MEMWAL_PRIVATE_KEY = "test-memwal-key-123";
    const { writeMemory, resetWriterRunState, costsLogPath } = await import(
      "../lib/memory-writer"
    );
    resetWriterRunState();
    const client: MemoryClient = {
      rememberAndWait: vi.fn(async () => ({
        id: "mem-x",
        job_id: "job-x",
        blob_id: "blob-x",
        owner: "0xowner",
        namespace: "kolo:x",
      })),
      recall: vi.fn(async () => ({ results: [] })),
    };
    await writeMemory({ ...event, txDigest: "tx-secret-check" }, { client });
    const logFile = costsLogPath();
    if (existsSync(logFile)) {
      const body = readFileSync(logFile, "utf8");
      expect(body).not.toContain("test-memwal-key-123");
    }
  });
});
