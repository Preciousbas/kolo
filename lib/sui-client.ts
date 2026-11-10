import "server-only";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SuiGrpcClient, type GrpcTransactionResult } from "@mysten/sui/grpc";
import type { SuiClientTypes } from "@mysten/sui/client";
import { getNetworkConfig, getNetworkName, tatumApiKey } from "./config";
import { publicFullnodeRpcUrl, publicGraphqlUrl } from "./tatum";

export type SuiVia = "tatum" | "grpc" | "graphql" | "saved";

function tatumGrpcBaseUrl(): string {
  const host = getNetworkConfig().grpcHost;
  return host.startsWith("http") ? host : `https://${host}`;
}

export function createTatumGrpc(): SuiGrpcClient {
  const key = tatumApiKey();
  if (!key) throw new Error("missing TATUM_API_KEY");
  return new SuiGrpcClient({
    network: getNetworkName(),
    baseUrl: tatumGrpcBaseUrl(),
    meta: { "x-api-key": key },
  });
}

export function createPublicGrpc(): SuiGrpcClient {
  return new SuiGrpcClient({
    network: getNetworkName(),
    baseUrl: publicFullnodeRpcUrl(),
  });
}

export function createTatumGraphql(): SuiGraphQLClient {
  const key = tatumApiKey();
  if (!key) throw new Error("missing TATUM_API_KEY");
  return new SuiGraphQLClient({
    network: getNetworkName(),
    url: getNetworkConfig().graphqlUrl,
    headers: { "x-api-key": key },
  });
}

export function createPublicGraphql(): SuiGraphQLClient {
  return new SuiGraphQLClient({
    network: getNetworkName(),
    url: publicGraphqlUrl(),
  });
}

/**
 * Mysten JS uses gRPC-Web. Tatum's gRPC gateway often returns native
 * `application/grpc`, which the SDK rejects — so prefer the public fullnode
 * (gRPC-Web) for SDK reads/writes. Tatum GraphQL remains the primary indexed path.
 */
export async function getGrpcClient(): Promise<{ client: SuiGrpcClient; via: SuiVia }> {
  return { client: createPublicGrpc(), via: "grpc" };
}

/** Prefer Tatum GraphQL when keyed; otherwise public GraphQL. */
export async function getGraphqlClient(): Promise<{
  client: SuiGraphQLClient;
  via: SuiVia;
}> {
  if (tatumApiKey()) {
    return { client: createTatumGraphql(), via: "tatum" };
  }
  return { client: createPublicGraphql(), via: "graphql" };
}

type AnyTxResult = GrpcTransactionResult<{
  effects: true;
  objectTypes: true;
  events: true;
}>;

/** Unwrap a gRPC sign/execute result; throw on FailedTransaction or error status. */
export function unwrapTx(
  result: AnyTxResult | SuiClientTypes.TransactionResult<{ effects?: true; objectTypes?: true; events?: true }>,
): SuiClientTypes.Transaction<{ effects: true; objectTypes: true; events: true }> {
  if (result.$kind === "FailedTransaction") {
    const failed = result.FailedTransaction;
    const message =
      failed.status.error?.message ||
      failed.effects?.status?.error ||
      "transaction failed";
    throw new Error(typeof message === "string" ? message : "transaction failed");
  }
  const tx = result.Transaction;
  if (tx.status.error) {
    throw new Error(tx.status.error.message || "transaction failed");
  }
  return tx as SuiClientTypes.Transaction<{
    effects: true;
    objectTypes: true;
    events: true;
  }>;
}
