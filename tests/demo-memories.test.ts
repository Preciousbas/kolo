import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function run(env: Record<string, string | undefined>, args: string[] = []) {
  return spawnSync(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", path.join(root, "scripts/demo-memories.ts"), ...args],
    {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        ...env,
      } as unknown as NodeJS.ProcessEnv,
      encoding: "utf8",
    },
  );
}

describe("memory:demo guards", () => {
  it("with no flags sends nothing (dry run)", () => {
    const result = run({
      KOLO_NETWORK: "testnet",
      KOLO_MEMORY_MOCK: "1",
      MEMWAL_PRIVATE_KEY: "",
      MEMWAL_ACCOUNT_ID: "",
      TATUM_API_KEY: "",
    });
    const out = `${result.stdout}\n${result.stderr}`;
    expect(result.status).toBe(0);
    expect(out).toMatch(/dry-run: sending nothing/);
    expect(out).toMatch(/planned: \d+/);
    const planned = Number((out.match(/planned: (\d+)/) || [])[1] || 0);
    expect(planned).toBeGreaterThanOrEqual(10);
  });

  it("refuses mainnet memory write when locked", () => {
    const result = run(
      {
        KOLO_NETWORK: "testnet",
        KOLO_MEMORY_NETWORK: "mainnet",
        KOLO_MEMORY_MOCK: "1",
      },
      ["--write"],
    );
    const out = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(out).toMatch(/mainnet memory locked/);
  });

  it("refuses when escrow KOLO_NETWORK is mainnet", () => {
    const result = run({
      KOLO_NETWORK: "mainnet",
      KOLO_ALLOW_MAINNET: "yes",
      KOLO_MEMORY_MOCK: "1",
    });
    const out = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(out).toMatch(/escrow must be testnet/);
  });

  it("refuses mainnet --write without --yes-mainnet", () => {
    const result = run(
      {
        KOLO_NETWORK: "testnet",
        KOLO_MEMORY_NETWORK: "mainnet",
        KOLO_ALLOW_MAINNET_MEMORY: "yes",
        KOLO_MEMORY_MOCK: "1",
      },
      ["--write"],
    );
    const out = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(out).toMatch(/--yes-mainnet/);
  });
});
