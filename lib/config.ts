import "server-only";
import { z } from "zod";

const USDC_DECIMALS = 6;

export const USDC_TYPE = {
  testnet:
    "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  mainnet:
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
} as const;

export const NETWORKS = {
  testnet: {
    rpcUrl: "https://sui-testnet.gateway.tatum.io",
    graphqlUrl: "https://sui-testnet.gateway.tatum.io/graphql",
    grpcHost: "sui-testnet-grpc.gateway.tatum.io:443",
    memwalRelayerUrl: "https://relayer.dev.memwal.ai",
    usdcType: USDC_TYPE.testnet,
    usdcDecimals: USDC_DECIMALS,
  },
  mainnet: {
    rpcUrl: "https://sui-mainnet.gateway.tatum.io",
    graphqlUrl: "https://sui-mainnet.gateway.tatum.io/graphql",
    grpcHost: "sui-mainnet-grpc.gateway.tatum.io:443",
    memwalRelayerUrl: "https://relayer.memory.walrus.xyz",
    usdcType: USDC_TYPE.mainnet,
    usdcDecimals: USDC_DECIMALS,
  },
} as const;

export type NetworkName = keyof typeof NETWORKS;

const NetworkNameSchema = z.enum(["testnet", "mainnet"]);

export function getNetworkName(): NetworkName {
  const raw = process.env.KOLO_NETWORK;
  if (raw === undefined || raw === "") return "testnet";
  const parsed = NetworkNameSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("invalid KOLO_NETWORK");
  }
  if (parsed.data === "mainnet" && process.env.KOLO_ALLOW_MAINNET !== "yes") {
    throw new Error("mainnet locked: set KOLO_ALLOW_MAINNET=yes");
  }
  return parsed.data;
}

export function assertNetworkAllowed(): NetworkName {
  return getNetworkName();
}

export function getNetworkConfig() {
  return NETWORKS[getNetworkName()];
}

/** MemWalMock is forbidden in production and when memory is configured for mainnet. */
export function memoryMockAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.KOLO_MEMORY_NETWORK === "mainnet") return false;
  return true;
}

export function isMock(): boolean {
  if (!memoryMockAllowed()) return false;
  return (
    !process.env.MEMWAL_PRIVATE_KEY ||
    !process.env.MEMWAL_ACCOUNT_ID ||
    process.env.KOLO_MEMORY_MOCK === "1"
  );
}

export function tatumApiKey(): string | undefined {
  const value = process.env.TATUM_API_KEY;
  return value ? value : undefined;
}

export function memwalPrivateKey(): string | undefined {
  const value = process.env.MEMWAL_PRIVATE_KEY;
  return value ? value : undefined;
}

export function memwalAccountId(): string | undefined {
  const value = process.env.MEMWAL_ACCOUNT_ID;
  return value ? value : undefined;
}

/**
 * Memory network is independent of escrow `KOLO_NETWORK`.
 * Mainnet memory requires KOLO_MEMORY_NETWORK=mainnet and KOLO_ALLOW_MAINNET_MEMORY=yes.
 */
export function memoryNetwork(): NetworkName {
  const raw = process.env.KOLO_MEMORY_NETWORK;
  if (raw === undefined || raw === "" || raw === "testnet") return "testnet";
  const parsed = NetworkNameSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("invalid KOLO_MEMORY_NETWORK");
  }
  if (parsed.data === "mainnet" && process.env.KOLO_ALLOW_MAINNET_MEMORY !== "yes") {
    throw new Error("mainnet memory locked");
  }
  return parsed.data;
}

/** Relayer URL for the memory network (not the escrow network). */
export function memoryRelayerUrl(): string {
  const override = process.env.MEMWAL_SERVER_URL;
  if (override) return override;
  return NETWORKS[memoryNetwork()].memwalRelayerUrl;
}

export function memwalServerUrl(): string {
  return memoryRelayerUrl();
}

export function memoryMaxTotal(): number {
  const raw = process.env.KOLO_MEMORY_MAX_TOTAL;
  if (raw === undefined || raw === "") return 20;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error("invalid KOLO_MEMORY_MAX_TOTAL");
  return Math.floor(n);
}

export function memoryMaxPerRun(): number {
  const raw = process.env.KOLO_MEMORY_MAX_PER_RUN;
  if (raw === undefined || raw === "") return 12;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error("invalid KOLO_MEMORY_MAX_PER_RUN");
  return Math.floor(n);
}

/** Testnet USDC type used by the demo escrow. Override with KOLO_COIN_TYPE. */
export function getCoinType(): string {
  return process.env.KOLO_COIN_TYPE || USDC_TYPE.testnet;
}

export function getPackageId(): string | undefined {
  const value = process.env.KOLO_PACKAGE_ID;
  return value ? value : undefined;
}

export function getDemoCircleId(): string | undefined {
  const value = process.env.KOLO_DEMO_CIRCLE_ID;
  return value ? value : undefined;
}

export const DEFAULT_WALLET0_ADDRESS =
  "0x913d3fb5a8fed297d69867291f7d83d13cd96e1d9b15c889f017626518e1de14";

export function getWallet0Address(): string {
  return process.env.KOLO_WALLET0_ADDRESS || DEFAULT_WALLET0_ADDRESS;
}

/** Hard refuse anything that is not testnet, even when KOLO_ALLOW_MAINNET=yes. */
export function assertTestnetOnly(action: string): void {
  const raw = process.env.KOLO_NETWORK;
  const network = raw === undefined || raw === "" ? "testnet" : raw;
  if (network !== "testnet") {
    throw new Error(`${action} is testnet only`);
  }
}
