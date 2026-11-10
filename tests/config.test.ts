import { afterEach, describe, expect, it } from "vitest";
import {
  getNetworkName,
  isMock,
  memoryMaxPerRun,
  memoryMaxTotal,
  memoryMockAllowed,
  memoryNetwork,
  memoryRelayerUrl,
  NETWORKS,
  USDC_TYPE,
} from "../lib/config";

const ENV_KEYS = [
  "KOLO_NETWORK",
  "KOLO_ALLOW_MAINNET",
  "MEMWAL_PRIVATE_KEY",
  "MEMWAL_ACCOUNT_ID",
  "KOLO_MEMORY_MOCK",
  "KOLO_MEMORY_NETWORK",
  "KOLO_ALLOW_MAINNET_MEMORY",
  "KOLO_MEMORY_MAX_TOTAL",
  "KOLO_MEMORY_MAX_PER_RUN",
  "MEMWAL_SERVER_URL",
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

describe("config", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("defaults to testnet", () => {
    saveEnv();
    delete process.env.KOLO_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET;
    expect(getNetworkName()).toBe("testnet");
  });

  it("locks mainnet unless KOLO_ALLOW_MAINNET=yes", () => {
    saveEnv();
    process.env.KOLO_NETWORK = "mainnet";
    delete process.env.KOLO_ALLOW_MAINNET;
    expect(() => getNetworkName()).toThrow("mainnet locked: set KOLO_ALLOW_MAINNET=yes");
    process.env.KOLO_ALLOW_MAINNET = "yes";
    expect(getNetworkName()).toBe("mainnet");
  });

  it("selects the USDC type for the network", () => {
    expect(NETWORKS.testnet.usdcType).toBe(USDC_TYPE.testnet);
    expect(NETWORKS.mainnet.usdcType).toBe(USDC_TYPE.mainnet);
    expect(USDC_TYPE.testnet).toContain("::usdc::USDC");
    expect(USDC_TYPE.mainnet).toContain("::usdc::USDC");
    expect(USDC_TYPE.testnet).not.toBe(USDC_TYPE.mainnet);
  });

  it("uses mock memory without keys or when forced", () => {
    saveEnv();
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    delete process.env.KOLO_MEMORY_MOCK;
    delete process.env.KOLO_MEMORY_NETWORK;
    expect(memoryMockAllowed()).toBe(true);
    expect(isMock()).toBe(true);
    process.env.MEMWAL_PRIVATE_KEY = "unit-test-secret-value";
    process.env.MEMWAL_ACCOUNT_ID = "account";
    expect(isMock()).toBe(false);
    process.env.KOLO_MEMORY_MOCK = "1";
    expect(isMock()).toBe(true);
  });

  it("refuses mock when KOLO_MEMORY_NETWORK=mainnet", () => {
    saveEnv();
    delete process.env.MEMWAL_PRIVATE_KEY;
    delete process.env.MEMWAL_ACCOUNT_ID;
    process.env.KOLO_MEMORY_MOCK = "1";
    process.env.KOLO_MEMORY_NETWORK = "mainnet";
    expect(memoryMockAllowed()).toBe(false);
    expect(isMock()).toBe(false);
  });

  it("memory network defaults, caps, and relayer", () => {
    saveEnv();
    delete process.env.KOLO_MEMORY_NETWORK;
    delete process.env.KOLO_ALLOW_MAINNET_MEMORY;
    delete process.env.KOLO_MEMORY_MAX_TOTAL;
    delete process.env.KOLO_MEMORY_MAX_PER_RUN;
    delete process.env.MEMWAL_SERVER_URL;
    expect(memoryNetwork()).toBe("testnet");
    expect(memoryMaxTotal()).toBe(20);
    expect(memoryMaxPerRun()).toBe(12);
    expect(memoryRelayerUrl()).toBe("https://relayer.dev.memwal.ai");
    process.env.KOLO_MEMORY_NETWORK = "mainnet";
    process.env.KOLO_ALLOW_MAINNET_MEMORY = "yes";
    expect(memoryRelayerUrl()).toBe("https://relayer.memory.walrus.xyz");
  });
});
