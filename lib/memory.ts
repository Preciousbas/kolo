import "server-only";
import { MemWal, MemWalMock } from "@mysten-incubation/memwal";
import {
  isMock,
  memwalAccountId,
  memwalPrivateKey,
  memoryMockAllowed,
  memoryNetwork,
  memoryRelayerUrl,
} from "./config";

export type RecallHit = {
  text?: string;
  blob_id?: string;
  created_at?: string;
  distance?: number;
};

export type RecallResult = {
  results?: RecallHit[];
  total?: number;
};

export type RememberResult = {
  id: string;
  job_id?: string;
  blob_id: string;
  owner: string;
  namespace: string;
};

export type RememberBulkItemResult = {
  id: string;
  blob_id: string;
  status: "done" | "failed" | "timeout";
  namespace: string;
  error?: string;
};

export type RememberBulkResult = {
  results: RememberBulkItemResult[];
  total: number;
  succeeded: number;
  failed: number;
};

export type MemoryClient = {
  rememberAndWait: (
    text: string,
    namespace?: string,
    opts?: { timeoutMs?: number; idempotencyKey?: string },
  ) => Promise<RememberResult>;
  rememberBulkAndWait?: (
    items: Array<{ text: string; namespace?: string }>,
    opts?: { timeoutMs?: number },
  ) => Promise<RememberBulkResult>;
  recall: (args: {
    query: string;
    limit?: number;
    namespace?: string;
  }) => Promise<RecallResult>;
};

const cache = new Map<string, MemoryClient>();

function asClient(value: unknown): MemoryClient {
  const client = value as MemoryClient;
  if (typeof client?.rememberAndWait !== "function" || typeof client?.recall !== "function") {
    throw new Error("memory client missing remember/recall");
  }
  return client;
}

export async function getMemory(
  namespace: string,
  options?: { mock?: boolean },
): Promise<MemoryClient> {
  const wantMock = options?.mock === true || isMock();
  if (wantMock && !memoryMockAllowed()) {
    throw new Error("memory mock refused in production/mainnet");
  }
  const useMock = wantMock && memoryMockAllowed();
  const net = useMock ? "mock" : memoryNetwork();
  const cacheKey = `${useMock ? "mock" : "real"}:${net}:${namespace}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  console.error(useMock ? "mock" : "real");

  if (useMock) {
    const created = await Promise.resolve(MemWalMock.create({ namespace }));
    const client = asClient(created);
    cache.set(cacheKey, client);
    return client;
  }

  // Escrow stays testnet; only MemWal writes may use mainnet when memoryNetwork() allows it.
  const key = memwalPrivateKey();
  const accountId = memwalAccountId();
  if (!key || !accountId) {
    throw new Error("memory refused: missing memwal env");
  }

  const created = await Promise.resolve(
    MemWal.create({
      key,
      accountId,
      serverUrl: memoryRelayerUrl(),
      namespace,
    }),
  );
  const client = asClient(created);
  cache.set(cacheKey, client);
  return client;
}

export async function remember(text: string, namespace = "kolo") {
  const client = await getMemory(namespace);
  return client.rememberAndWait(text, namespace, { timeoutMs: 60_000 });
}

export async function recall(query: string, limit?: number, namespace = "kolo") {
  const client = await getMemory(namespace);
  return client.recall(
    limit === undefined ? { query, namespace } : { query, limit, namespace },
  );
}

export function resetMemoryForTests() {
  cache.clear();
}
