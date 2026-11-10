import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function runScript(
  script: "seed:demo" | "reset:demo",
  env: Record<string, string | undefined>,
  args: string[] = [],
) {
  return spawnSync("npm", ["run", script, "--", ...args], {
    cwd: root,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ...env,
    } as unknown as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
}

describe("seed and reset guards", () => {
  it("refuses with missing env and prints only env names", () => {
    // Explicit empty stubs so dotenv/.env.local cannot refill real local values.
    const result = runScript("seed:demo", {
      KOLO_NETWORK: "testnet",
      KOLO_PACKAGE_ID: "",
      KOLO_SEED_MNEMONIC: "",
      KOLO_DEMO_CIRCLE_ID: "",
    });
    expect(result.status).toBe(1);
    const out = `${result.stdout}\n${result.stderr}`;
    expect(out).toMatch(/missing KOLO_PACKAGE_ID/);
    expect(out).toMatch(/missing KOLO_SEED_MNEMONIC/);
    expect(out).not.toMatch(/abandon /);
  });

  it("refuses mainnet even when KOLO_ALLOW_MAINNET=yes", () => {
    const result = runScript("seed:demo", {
      KOLO_NETWORK: "mainnet",
      KOLO_ALLOW_MAINNET: "yes",
      KOLO_PACKAGE_ID: "0xdead",
      KOLO_SEED_MNEMONIC:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });
    expect(result.status).toBe(1);
    const out = `${result.stdout}\n${result.stderr}`;
    expect(out).toMatch(/seed is testnet only/);
  });

  it("reset --dry-run prints the plan and sends nothing when env is set", () => {
    const result = runScript(
      "reset:demo",
      {
        KOLO_NETWORK: "testnet",
        KOLO_PACKAGE_ID: "0xdeadbeef",
        KOLO_SEED_MNEMONIC:
          "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        KOLO_WALLET0_ADDRESS: "skip-check-via-dry-run",
      },
      ["--dry-run"],
    );
    // dry-run still derives wallets; wallet0 mismatch may exit before plan if check runs.
    // Our reset prints plan before wallet checks when dry-run — verify plan text.
    const out = `${result.stdout}\n${result.stderr}`;
    expect(out).toMatch(/reset plan:/);
    expect(out).toMatch(/dry-run: sending nothing/);
    expect(result.status).toBe(0);
  });
});
