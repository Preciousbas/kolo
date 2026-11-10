import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts/smoke-tatum.ts");

function run(env: Record<string, string | undefined>) {
  return spawnSync(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", script],
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

describe("smoke:tatum guards", () => {
  it("SKIPs without a key and exits 0", () => {
    const result = run({
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      KOLO_NETWORK: "testnet",
      // Blank so dotenv does not fill from .env (dotenv never overrides).
      TATUM_API_KEY: "",
    });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/SKIP missing TATUM_API_KEY/);
  });

  it("refuses mainnet", () => {
    const result = run({
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      KOLO_NETWORK: "mainnet",
      KOLO_ALLOW_MAINNET: "yes",
      TATUM_API_KEY: "fake-key-not-used",
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/smoke is testnet only/i);
  });
});
