import "server-only";

const SECRET_ENV = [
  "TATUM_API_KEY",
  "TATUM_API_KEY_TESTNET",
  "MEMWAL_PRIVATE_KEY",
  "CRON_SECRET",
  "LLM_API_KEY",
  "KOLO_SEED_MNEMONIC",
  "KOLO_SESSION_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

export function redact(text: string): string {
  let out = text;
  for (const name of SECRET_ENV) {
    const value = process.env[name];
    if (!value || value.length < 8) continue;
    out = out.split(value).join("***");
  }
  return out;
}
