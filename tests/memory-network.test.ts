import { afterEach, describe, expect, it } from "vitest";
import { getNetworkName, memoryNetwork } from "../lib/config";

const ENV_KEYS = [
  "KOLO_NETWORK",
  "KOLO_ALLOW_MAINNET",
  "KOLO_MEMORY_NETWORK",
  "KOLO_ALLOW_MAINNET_MEMORY",
] as const;

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

describe("memoryNetwork", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("defaults to testnet", () => {
    saveEnv();
    delete process.env.KOLO_MEMORY_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
    expect(memoryNetwork()).toBe("testnet");
  });

  it("throws mainnet memory locked without both flags", () => {
    saveEnv();
    process.env.KOLO_MEMORY_NETWORK = "mainnet";
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
    expect(() => memoryNetwork()).toThrow("mainnet memory locked");
    process.env.KOLO_ALLOW_MAINNET_MEMORY = "yes";
    expect(memoryNetwork()).toBe("mainnet");
  });

  it("does not change escrow KOLO_NETWORK", () => {
    saveEnv();
    delete process.env.KOLO_NETWORK;
    process.env.KOLO_MEMORY_NETWORK = "mainnet";
    process.env.KOLO_ALLOW_MAINNET_MEMORY = "yes";
    expect(memoryNetwork()).toBe("mainnet");
    expect(getNetworkName()).toBe("testnet");
  });
});
