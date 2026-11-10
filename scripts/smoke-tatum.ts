import { config as loadDotenv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

loadDotenv({ quiet: true });
loadDotenv({ path: ".env.local", quiet: true });

import { assertTestnetOnly, getDemoCircleId, getPackageId, tatumApiKey } from "../lib/config";
import { redact } from "../lib/redact";
import {
  tatumGraphql,
  tatumGrpc,
  tatumJsonRpc,
  HttpStatusError,
  TatumTransportError,
} from "../lib/tatum";
import { getCircleEvents, getCircleState, getMemberBalances } from "../lib/feed";
import { toNaira } from "../lib/price";

function out(line: string) {
  console.log(redact(line));
}

function resolveCircleId(): string | undefined {
  const fromEnv = getDemoCircleId();
  if (fromEnv) return fromEnv;
  const file = path.join(process.cwd(), "data/demo-state.json");
  if (!existsSync(file)) return undefined;
  const saved = JSON.parse(readFileSync(file, "utf8")) as { circleId?: string };
  return saved.circleId || undefined;
}

async function main() {
  try {
    assertTestnetOnly("smoke");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    out(`FAIL refuse ${msg}`);
    process.exit(1);
  }

  const apiKey = process.env.TATUM_API_KEY || process.env.TATUM_API_KEY_TESTNET || tatumApiKey();
  if (!apiKey) {
    out("SKIP missing TATUM_API_KEY");
    process.exit(0);
  }
  if (!process.env.TATUM_API_KEY && process.env.TATUM_API_KEY_TESTNET) {
    process.env.TATUM_API_KEY = process.env.TATUM_API_KEY_TESTNET;
  }

  const circleId = resolveCircleId();
  if (!circleId) {
    out("SKIP missing KOLO_DEMO_CIRCLE_ID");
    process.exit(0);
  }

  let credits = 0;
  let failed = false;

  // graphql-checkpoint
  try {
    const r = await tatumGraphql("{ checkpoint { sequenceNumber } }");
    const root = r.data as { data?: { checkpoint?: { sequenceNumber?: string | number } } };
    const seq = root?.data?.checkpoint?.sequenceNumber;
    credits += 1;
    out(`PASS graphql-checkpoint seq=${seq} via=${r.via} ms=${r.ms}`);
  } catch (error) {
    failed = true;
    out(`FAIL graphql-checkpoint ${error instanceof Error ? error.message : error}`);
  }

  // grpc-checkpoint
  try {
    const { data: client, via, ms } = await tatumGrpc();
    const info = await client.getChainIdentifier({});
    credits += 1;
    const chain =
      typeof info === "string"
        ? info
        : (info as { chainIdentifier?: string })?.chainIdentifier ?? "ok";
    out(`PASS grpc-checkpoint chain=${chain} via=${via} ms=${ms}`);
  } catch (error) {
    out(`FAIL grpc-checkpoint ${error instanceof Error ? error.message : error}`);
  }

  // jsonrpc-checkpoint (expected to fail after EOL)
  try {
    const r = await tatumJsonRpc("sui_getLatestCheckpointSequenceNumber", []);
    credits += 1;
    out(`PASS jsonrpc-checkpoint seq=${r.data} via=${r.via}`);
  } catch (error) {
    const status =
      error instanceof HttpStatusError || error instanceof TatumTransportError
        ? error.status
        : undefined;
    out(
      `INFO jsonrpc-checkpoint expected-fail status=${status ?? "n/a"} ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  // circle-state
  try {
    const state = await getCircleState(circleId, { packageId: getPackageId() });
    credits += 2;
    out(
      `PASS circle-state round=${state.round} potUsd=${state.potUsd} via=${state.via} source=${state.source}`,
    );
  } catch (error) {
    out(`FAIL circle-state ${error instanceof Error ? error.message : error}`);
  }

  // circle-events
  try {
    const feed = await getCircleEvents(circleId, { packageId: getPackageId() });
    credits += 3;
    out(`PASS circle-events count=${feed.events.length} via=${feed.via}`);
  } catch (error) {
    failed = true;
    out(`FAIL circle-events ${error instanceof Error ? error.message : error}`);
  }

  // member-balances
  try {
    const state = await getCircleState(circleId, { packageId: getPackageId() });
    const addrs = state.members.map((m) => m.address).filter(Boolean).slice(0, 2);
    if (addrs.length === 0) {
      out("SKIP member-balances no addresses");
    } else {
      const bals = await getMemberBalances(addrs);
      credits += addrs.length;
      out(`PASS member-balances n=${bals.length} via=${bals[0]?.via}`);
    }
  } catch (error) {
    out(`FAIL member-balances ${error instanceof Error ? error.message : error}`);
  }

  // price
  for (const symbol of ["SUI", "USDC"] as const) {
    try {
      const priced = await toNaira(1, symbol);
      credits += 20;
      if (priced.amountNgn === null) {
        out(`PASS price ${symbol}/NGN unavailable (${priced.note})`);
      } else {
        out(`PASS price ${symbol}/NGN=${priced.ngnPerUnit} priceAt=${priced.priceAt}`);
      }
    } catch (error) {
      out(`FAIL price ${symbol}/NGN ${error instanceof Error ? error.message : error}`);
    }
  }

  out(`INFO credits-used-estimate=${credits}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  out(`FAIL smoke ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
