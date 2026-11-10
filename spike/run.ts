import "./load-env";
import { assertNetworkAllowed, getNetworkName, tatumApiKey } from "../lib/config";
import { getMemory } from "../lib/memory";
import { redact } from "../lib/redact";
import { latestCheckpoint, price } from "../lib/tatum";

function emit(line: string) {
  process.stdout.write(`${redact(line)}\n`);
}

function skip(name: string, envName: string) {
  emit(`SKIP ${name} missing ${envName}`);
}

async function checkTatumSui(failed: { value: boolean }) {
  const name = "tatum-sui";
  if (!tatumApiKey()) {
    skip(name, "TATUM_API_KEY");
    return;
  }
  try {
    const network = getNetworkName();
    const checkpoint = await latestCheckpoint();
    const via =
      checkpoint.via === "graphql" && checkpoint.jsonrpcStatus !== undefined
        ? `via=graphql (jsonrpc ${checkpoint.jsonrpcStatus})`
        : `via=${checkpoint.via}`;
    emit(`PASS ${name} ${network} seq=${checkpoint.seq} ${via}`);
  } catch (error) {
    failed.value = true;
    const reason = error instanceof Error ? error.message : "request failed";
    emit(`FAIL ${name} ${reason}`);
  }
}

async function checkMemwal(failed: { value: boolean }, mock: boolean) {
  const name = "memwal-roundtrip";
  if (!mock) {
    const missing: string[] = [];
    if (!process.env.MEMWAL_PRIVATE_KEY) missing.push("MEMWAL_PRIVATE_KEY");
    if (!process.env.MEMWAL_ACCOUNT_ID) missing.push("MEMWAL_ACCOUNT_ID");
    if (missing.length > 0) {
      skip(name, missing.join(" "));
      return;
    }
    if (getNetworkName() !== "testnet") {
      failed.value = true;
      emit(`FAIL ${name} refused: testnet only`);
      return;
    }
  }

  const started = Date.now();
  const stamp = new Date().toISOString();
  try {
    const client = await getMemory("kolo-spike", { mock });
    await client.rememberAndWait(`kolo spike check ${stamp}`);
    const recalled = await client.recall({ query: "kolo spike check" });
    const results = recalled.results ?? [];
    const matched = results.some((item) => (item.text ?? "").includes(stamp));
    const latency = Date.now() - started;
    if (!matched) {
      failed.value = true;
      emit(`FAIL ${name} timestamp not recalled results=${results.length}`);
      return;
    }
    const mode = mock ? "(mock) " : "";
    emit(`PASS ${name} ${mode}latency=${latency}ms results=${results.length}`);
  } catch (error) {
    failed.value = true;
    const reason = error instanceof Error ? error.message : "request failed";
    emit(`FAIL ${name} ${reason}`);
  }
}

async function checkPrice(failed: { value: boolean }) {
  const name = "tatum-price";
  if (!tatumApiKey()) {
    skip(name, "TATUM_API_KEY");
    return;
  }
  const pairs = [
    ["SUI", "NGN"],
    ["SUI", "GBP"],
    ["USDC", "NGN"],
    ["USDC", "GBP"],
  ] as const;
  const quotes = [];
  for (const [symbol, basePair] of pairs) {
    quotes.push(await price(symbol, basePair));
  }
  const byKey = new Map(quotes.map((quote) => [`${quote.symbol}/${quote.basePair}`, quote]));
  const suiNgn = byKey.get("SUI/NGN");
  const suiGbp = byKey.get("SUI/GBP");
  const suiOk = Boolean(suiNgn?.value) && Boolean(suiGbp?.value) && !Number.isNaN(Number(suiNgn?.value)) && !Number.isNaN(Number(suiGbp?.value));
  const parts = pairs.map(([symbol, basePair]) => {
    const quote = byKey.get(`${symbol}/${basePair}`);
    const numeric = quote?.value !== null && quote?.value !== undefined && !Number.isNaN(Number(quote.value));
    if (symbol === "USDC" && !numeric) {
      return `${symbol}/${basePair}=UNCONFIRMED support`;
    }
    const stamp = quote?.timestamp ? `@${quote.timestamp}` : "";
    return `${symbol}/${basePair}=${quote?.value ?? "missing"}${stamp}`;
  });
  if (!suiOk) {
    failed.value = true;
    emit(`FAIL ${name} ${parts.join(" ")}`);
    return;
  }
  emit(`PASS ${name} ${parts.join(" ")}`);
}

async function main() {
  try {
    assertNetworkAllowed();
  } catch (error) {
    const message = error instanceof Error ? error.message : "network locked";
    process.stderr.write(`${redact(message)}\n`);
    process.exit(1);
  }

  const mock = process.argv.includes("--mock");
  const failed = { value: false };
  await checkTatumSui(failed);
  await checkMemwal(failed, mock);
  await checkPrice(failed);
  if (failed.value) process.exit(1);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "spike failed";
  process.stderr.write(`${redact(message)}\n`);
  process.exit(1);
});
