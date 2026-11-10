import "server-only";
import { nowMs } from "./clock";

const PREFIX = "kolo:";

type MemoryRow = { value: string; expiresAt: number | null };

const memory = new Map<string, MemoryRow>();

function namespaced(key: string): string {
  return key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
}

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstash(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("missing Upstash");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error("upstash request failed");
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

export function resetKvForTests(): void {
  memory.clear();
}

export async function kvGet(key: string): Promise<string | null> {
  const k = namespaced(key);
  if (upstashConfigured() && process.env.KOLO_KV !== "memory") {
    const value = await upstash(["GET", k]);
    return typeof value === "string" ? value : null;
  }
  const row = memory.get(k);
  if (!row) return null;
  if (row.expiresAt !== null && row.expiresAt <= nowMs()) {
    memory.delete(k);
    return null;
  }
  return row.value;
}

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const k = namespaced(key);
  if (upstashConfigured() && process.env.KOLO_KV !== "memory") {
    if (ttlSeconds && ttlSeconds > 0) {
      await upstash(["SET", k, value, "EX", ttlSeconds]);
    } else {
      await upstash(["SET", k, value]);
    }
    return;
  }
  memory.set(k, {
    value,
    expiresAt: ttlSeconds && ttlSeconds > 0 ? nowMs() + ttlSeconds * 1000 : null,
  });
}

export async function kvDel(key: string): Promise<void> {
  const k = namespaced(key);
  if (upstashConfigured() && process.env.KOLO_KV !== "memory") {
    await upstash(["DEL", k]);
    return;
  }
  memory.delete(k);
}
