import "server-only";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { getNetworkConfig, getNetworkName, tatumApiKey } from "./config";

const TIMEOUT_MS = 8_000;
const MIN_GAP_MS = 340; // ≤3 req/s
const CHAIN_CACHE_MS = 15_000;

export type TransportVia = "graphql" | "grpc" | "jsonrpc" | "fullnode";

export type TransportResult<T> = {
  data: T;
  via: TransportVia;
  ms: number;
};

export type TatumErrorCode = "bad-key" | "no-key" | "rate-limit" | "http" | "transport";

export class HttpStatusError extends Error {
  status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

export class TatumTransportError extends Error {
  code: TatumErrorCode;
  status?: number;

  constructor(code: TatumErrorCode, message: string, status?: number) {
    super(message);
    this.name = "TatumTransportError";
    this.code = code;
    this.status = status;
  }
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + MIN_GAP_MS - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

const chainCache = new Map<string, { expires: number; value: unknown }>();

export function clearTatumCaches(): void {
  chainCache.clear();
  lastRequestAt = 0;
}

function cacheGet<T>(key: string): T | undefined {
  const hit = chainCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    chainCache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs = CHAIN_CACHE_MS): void {
  chainCache.set(key, { expires: Date.now() + ttlMs, value });
}

function mapHttpError(status: number, hasKey: boolean): never {
  if (status === 401) {
    throw new TatumTransportError("bad-key", "bad-key", status);
  }
  if (status === 404 && !hasKey) {
    throw new TatumTransportError("no-key", "no-key", status);
  }
  if (status === 429) {
    throw new TatumTransportError("rate-limit", "rate-limit", status);
  }
  throw new HttpStatusError(status);
}

async function fetchRetry(url: string, init: RequestInit): Promise<Response> {
  await throttle();
  const delays = [0, 400];
  let last: Response | null = null;
  for (const delay of delays) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      await throttle();
    }
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status !== 429) return response;
    last = response;
  }
  if (!last) throw new TatumTransportError("rate-limit", "rate-limit", 429);
  return last;
}

function apiKeyHeader(): HeadersInit {
  const key = tatumApiKey();
  return key ? { "x-api-key": key } : {};
}

function tatumGrpcBaseUrl(): string {
  const host = getNetworkConfig().grpcHost;
  return host.startsWith("http") ? host : `https://${host}`;
}

export function publicFullnodeRpcUrl(): string {
  const network = getNetworkName();
  return network === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";
}

export function publicGraphqlUrl(): string {
  const network = getNetworkName();
  return network === "mainnet"
    ? "https://graphql.mainnet.sui.io/graphql"
    : "https://graphql.testnet.sui.io/graphql";
}

/** Legacy JSON-RPC helper used by spike / existing tests. */
export async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetchRetry(getNetworkConfig().rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...apiKeyHeader(),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) {
    throw new Error(body.error.message || "jsonrpc error");
  }
  return body.result;
}

/** Legacy GraphQL helper used by spike / existing tests. */
export async function gql(query: string): Promise<unknown> {
  const response = await fetchRetry(getNetworkConfig().graphqlUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...apiKeyHeader(),
    },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  return response.json();
}

/**
 * Tatum GraphQL gateway.
 * POST https://sui-{network}.gateway.tatum.io/graphql
 */
export async function tatumGraphql(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TransportResult<unknown>> {
  const started = Date.now();
  const key = tatumApiKey();
  const cacheKey = `gql:${query}:${JSON.stringify(variables ?? {})}`;
  const cached = cacheGet<TransportResult<unknown>>(cacheKey);
  if (cached) return { ...cached, ms: 0 };

  const response = await fetchRetry(getNetworkConfig().graphqlUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...apiKeyHeader(),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) mapHttpError(response.status, Boolean(key));
  const payload = await response.json();
  const result: TransportResult<unknown> = {
    data: payload,
    via: "graphql",
    ms: Date.now() - started,
  };
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Tatum gRPC client via @mysten/sui SuiGrpcClient.
 * Auth: x-api-key through GrpcWebOptions.meta (confirmed in @mysten/sui 2.x types).
 */
export async function tatumGrpc(): Promise<TransportResult<SuiGrpcClient>> {
  const started = Date.now();
  const key = tatumApiKey();
  if (!key) {
    throw new TatumTransportError("no-key", "no-key");
  }
  // meta is part of GrpcWebOptions / RpcOptions — maps to request headers.
  const client = new SuiGrpcClient({
    network: getNetworkName(),
    baseUrl: tatumGrpcBaseUrl(),
    meta: { "x-api-key": key },
  });
  return { data: client, via: "grpc", ms: Date.now() - started };
}

/**
 * Tatum JSON-RPC (tried last; EOL after July 2026 per Tatum changelog).
 * Testnet gateway currently 404s JSON-RPC — callers should tolerate failure.
 */
export async function tatumJsonRpc(
  method: string,
  params: unknown[],
): Promise<TransportResult<unknown>> {
  const started = Date.now();
  const key = tatumApiKey();
  const cacheKey = `rpc:${method}:${JSON.stringify(params)}`;
  const cached = cacheGet<TransportResult<unknown>>(cacheKey);
  if (cached) return { ...cached, ms: 0 };

  const response = await fetchRetry(getNetworkConfig().rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...apiKeyHeader(),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) mapHttpError(response.status, Boolean(key));
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) {
    throw new TatumTransportError("transport", body.error.message || "jsonrpc error");
  }
  const result: TransportResult<unknown> = {
    data: body.result,
    via: "jsonrpc",
    ms: Date.now() - started,
  };
  cacheSet(cacheKey, result);
  return result;
}

/** Public fullnode JSON-RPC fallback (last resort). */
export async function fullnodeJsonRpc(
  method: string,
  params: unknown[],
): Promise<TransportResult<unknown>> {
  const started = Date.now();
  const response = await fetchRetry(publicFullnodeRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "fullnode jsonrpc error");
  return { data: body.result, via: "fullnode", ms: Date.now() - started };
}

/** Public GraphQL fullnode fallback. */
export async function fullnodeGraphql(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TransportResult<unknown>> {
  const started = Date.now();
  const response = await fetchRetry(publicGraphqlUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  return { data: await response.json(), via: "fullnode", ms: Date.now() - started };
}

/**
 * Prefer GraphQL → gRPC → JSON-RPC → public fullnode.
 * Always report `via` so UI/judges see Tatum served the data when it did.
 */
export async function withTatumFallback<T>(ops: {
  graphql?: () => Promise<TransportResult<T>>;
  grpc?: () => Promise<TransportResult<T>>;
  jsonrpc?: () => Promise<TransportResult<T>>;
  fullnode?: () => Promise<TransportResult<T>>;
}): Promise<TransportResult<T>> {
  const errors: string[] = [];
  for (const [name, run] of [
    ["graphql", ops.graphql],
    ["grpc", ops.grpc],
    ["jsonrpc", ops.jsonrpc],
    ["fullnode", ops.fullnode],
  ] as const) {
    if (!run) continue;
    try {
      return await run();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // Never include headers or API key material in aggregated errors.
      errors.push(`${name}:${msg}`);
    }
  }
  throw new TatumTransportError("transport", `all transports failed: ${errors.join("; ")}`);
}

export type Checkpoint = {
  seq: string;
  via: "jsonrpc" | "graphql";
  jsonrpcStatus?: number;
};

function readSequence(payload: unknown): string {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const checkpoint = asRecord(data?.checkpoint);
  const seq = checkpoint?.sequenceNumber ?? data?.sequenceNumber;
  if (typeof seq === "string" || typeof seq === "number") return String(seq);
  throw new Error("checkpoint sequence missing");
}

// UNCONFIRMED: Tatum docs list testnet as gRPC only, but the marketing page says JSON-RPC.
// Try JSON-RPC first and fall back to GraphQL, which works without a key.
export async function latestCheckpoint(): Promise<Checkpoint> {
  try {
    const seq = await rpc("sui_getLatestCheckpointSequenceNumber", []);
    if (typeof seq !== "string" && typeof seq !== "number") {
      throw new Error("jsonrpc checkpoint missing");
    }
    return { seq: String(seq), via: "jsonrpc" };
  } catch (error) {
    const status = error instanceof HttpStatusError ? error.status : undefined;
    const payload = await gql("{ checkpoint { sequenceNumber } }");
    return {
      seq: readSequence(payload),
      via: "graphql",
      ...(status === undefined ? {} : { jsonrpcStatus: status }),
    };
  }
}

/** Probe each Tatum interface for /api/health. */
export async function probeTatumInterfaces(): Promise<{
  graphql: "ok" | "error" | "no-key" | "skipped";
  grpc: "ok" | "error" | "no-key" | "skipped";
  jsonrpc: "ok" | "error" | "no-key" | "skipped";
}> {
  const key = tatumApiKey();
  if (!key) {
    return { graphql: "no-key", grpc: "no-key", jsonrpc: "no-key" };
  }

  let graphql: "ok" | "error" = "error";
  let grpc: "ok" | "error" = "error";
  let jsonrpc: "ok" | "error" | "skipped" = "error";

  try {
    const result = await tatumGraphql("{ checkpoint { sequenceNumber } }");
    readSequence(result.data);
    graphql = "ok";
  } catch {
    graphql = "error";
  }

  try {
    const { data: client } = await tatumGrpc();
    // UNCONFIRMED: getChainIdentifier availability on Tatum gRPC gateway.
    await client.getChainIdentifier({});
    grpc = "ok";
  } catch {
    grpc = "error";
  }

  try {
    await tatumJsonRpc("sui_getLatestCheckpointSequenceNumber", []);
    jsonrpc = "ok";
  } catch (error) {
    // Expected after EOL / testnet 404 — mark skipped when 404.
    if (error instanceof HttpStatusError && error.status === 404) {
      jsonrpc = "skipped";
    } else if (error instanceof TatumTransportError && error.status === 404) {
      jsonrpc = "skipped";
    } else {
      jsonrpc = "error";
    }
  }

  return { graphql, grpc, jsonrpc };
}

export type PriceQuote = {
  symbol: string;
  basePair: string;
  value: string | null;
  timestamp: string | null;
  source: string | null;
};

function readField(record: JsonRecord | null, key: string): string | null {
  const value = record?.[key];
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

// UNCONFIRMED: Price API response shape. Expect { value, basePair, timestamp, source } and parse defensively.
export async function price(symbol: string, basePair: string): Promise<PriceQuote> {
  const key = tatumApiKey();
  if (!key) {
    return { symbol, basePair, value: null, timestamp: null, source: null };
  }
  const url = new URL("https://api.tatum.io/v4/data/rate/symbol");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("basePair", basePair);
  try {
    const response = await fetchRetry(url.toString(), {
      method: "GET",
      headers: { "x-api-key": key },
    });
    if (!response.ok) {
      return { symbol, basePair, value: null, timestamp: null, source: null };
    }
    const payload: unknown = await response.json();
    const root = asRecord(payload);
    const nested = asRecord(root?.data) ?? root;
    return {
      symbol,
      basePair: readField(nested, "basePair") ?? basePair,
      value: readField(nested, "value") ?? readField(nested, "price"),
      timestamp: readField(nested, "timestamp"),
      source: readField(nested, "source"),
    };
  } catch {
    return { symbol, basePair, value: null, timestamp: null, source: null };
  }
}
