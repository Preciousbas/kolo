import "../spike/load-env";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  assertTestnetOnly,
  getNetworkName,
  getPackageId,
  isMock,
  memoryMaxPerRun,
  memoryMaxTotal,
  memoryNetwork,
} from "../lib/config";
import { readSavedDemoState } from "../lib/demo-state";
import { getCircleEvents, type KoloEvent } from "../lib/feed";
import { getMemory } from "../lib/memory";
import { shortAddress, toMemory } from "../lib/memory-record";
import {
  appendLedgerRow,
  memoryKey,
  readLedger,
  resetWriterRunState,
  resolveMemoryNetworkLabel,
  walruscanBlobLink,
  writeMemory,
  type LedgerRow,
} from "../lib/memory-writer";
import { redact } from "../lib/redact";

function emit(line: string) {
  process.stdout.write(`${redact(line)}\n`);
}

function emitErr(line: string) {
  process.stderr.write(`${redact(line)}\n`);
}

function parseArgs(argv: string[]) {
  return {
    write: argv.includes("--write"),
    yesMainnet: argv.includes("--yes-mainnet"),
    dryRun: !argv.includes("--write"),
  };
}

/** Build synthetic contribution/payout events from saved demo state when feed is offline. */
function eventsFromDemoState(): KoloEvent[] {
  const saved = readSavedDemoState();
  const circleId =
    saved.circleId ||
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const coinType = saved.coinType || "";
  const members = (saved.members.length ? saved.members : Array.from({ length: 6 }, (_, i) => ({
    name: `m${i}`,
    address: "",
    index: i,
  }))).map((m, i) => ({
    ...m,
    index: m.index ?? i,
    address:
      m.address ||
      `0x${(i + 1).toString(16).padStart(64, "0")}`,
  }));
  const digests = saved.digests ?? [];
  const events: KoloEvent[] = [];
  let di = 0;

  // Rounds 1..completedRounds: all members contributed; then payout.
  // Always cover at least rounds 1–2 so dry-run plans ≥10 (12 payments + 2 payouts).
  const completedPayouts = saved.payouts.filter((p) => p.txRef).length;
  const completedRounds = Math.max(
    2,
    completedPayouts,
    saved.round > 1 ? saved.round - 1 : 0,
  );

  for (let round = 1; round <= completedRounds; round += 1) {
    for (const m of members) {
      const digest = digests[di++] || `synth-pay-${round}-${m.index}`;
      events.push({
        kind: "contributed",
        circleId,
        round,
        member: m.address,
        amountRaw: String(Math.round((saved.contributionUsd || 20) * 1_000_000)),
        coinType,
        decimals: 6,
        roundComplete: m.index === members.length - 1,
        txDigest: digest,
        checkpoint: null,
        timestampMs: Date.parse(saved.updatedAt || "2026-11-01T00:00:00.000Z") + round * 60_000 + m.index,
        explorerUrl: "",
        via: "saved",
      });
    }
    const payout = saved.payouts.find((p) => p.round === round);
    const recipient =
      members.find((m) => m.name === payout?.recipient || m.address === payout?.recipient)?.address ||
      members[(round - 1) % members.length]?.address ||
      "";
    events.push({
      kind: "paid_out",
      circleId,
      round,
      member: recipient,
      amountRaw: String(Math.round((saved.contributionUsd || 20) * members.length * 1_000_000)),
      coinType,
      decimals: 6,
      auto: true,
      txDigest: payout?.txRef || digests[di++] || `synth-out-${round}`,
      checkpoint: null,
      timestampMs: Date.parse(saved.updatedAt || "2026-11-01T00:00:00.000Z") + round * 60_000 + 500,
      explorerUrl: "",
      via: "saved",
    });
  }

  // Current open round partial payments.
  if (saved.round > completedRounds) {
    const round = saved.round;
    members.forEach((m, i) => {
      if (!saved.paidThisRound[i]) return;
      const digest = digests[di++] || `synth-pay-${round}-${m.index}`;
      events.push({
        kind: "contributed",
        circleId,
        round,
        member: m.address,
        amountRaw: String(Math.round((saved.contributionUsd || 20) * 1_000_000)),
        coinType,
        decimals: 6,
        roundComplete: false,
        txDigest: digest,
        checkpoint: null,
        timestampMs: Date.parse(saved.updatedAt || "2026-11-01T00:00:00.000Z") + round * 60_000 + m.index,
        explorerUrl: "",
        via: "saved",
      });
    });
  }

  return events;
}

async function loadEvents(circleId: string): Promise<KoloEvent[]> {
  const saved = readSavedDemoState();
  try {
    if (!process.env.TATUM_API_KEY) throw new Error("no tatum");
    const feed = await getCircleEvents(circleId, {
      packageId: getPackageId() || saved.packageId || undefined,
      coinType: saved.coinType || undefined,
    });
    const useful = feed.events.filter((e) => e.kind === "contributed" || e.kind === "paid_out");
    if (useful.length >= 10) return useful;
  } catch {
    // fall through
  }
  return eventsFromDemoState();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirmMainnet(count: number): Promise<boolean> {
  if (!process.stdin.isTTY) {
    emitErr("mainnet write requires an interactive TTY to type MAINNET");
    return false;
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Type MAINNET to write ${count} memories: `);
    return answer.trim() === "MAINNET";
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Escrow must stay testnet even when memory network is mainnet.
  try {
    assertTestnetOnly("memory:demo escrow");
    getNetworkName(); // also validates KOLO_NETWORK shape
  } catch (error) {
    const message = error instanceof Error ? error.message : "refused";
    if (/testnet only/i.test(message) || /KOLO_NETWORK/i.test(message)) {
      emitErr("refuses: escrow must be testnet");
      process.exit(1);
    }
    emitErr(message);
    process.exit(1);
  }

  let memNet: "testnet" | "mainnet";
  try {
    memNet = memoryNetwork();
  } catch (error) {
    const message = error instanceof Error ? error.message : "memory network locked";
    emitErr(message);
    process.exit(1);
  }

  if (args.write && memNet === "mainnet" && !args.yesMainnet) {
    emitErr("refuses: mainnet write needs --yes-mainnet");
    process.exit(1);
  }

  const saved = readSavedDemoState();
  // Dry-run can plan from synthetic demo-state events; --write still needs a real id.
  const syntheticCircleId = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const circleId = saved.circleId || process.env.KOLO_DEMO_CIRCLE_ID || (args.dryRun ? syntheticCircleId : "");
  if (!circleId) {
    emitErr("missing circleId in data/demo-state.json");
    process.exit(1);
  }

  const events = await loadEvents(circleId);
  const planned = events.filter((e) => e.kind === "contributed" || e.kind === "paid_out");

  emit(`memory network: ${isMock() ? "mock" : memNet}`);
  emit(`escrow network: testnet`);
  emit(`planned: ${planned.length}`);
  emit(`estimated points: ${planned.length * 5}`);
  emit(`cap total=${memoryMaxTotal()} perRun=${memoryMaxPerRun()}`);

  const networkLabel = resolveMemoryNetworkLabel();
  const existing = readLedger(networkLabel);
  emit(`ledger existing on ${networkLabel}: ${existing.length}`);

  for (const event of planned) {
    try {
      const { memory } = toMemory(event, events);
      emit(
        `  ${shortAddress(memory.member)} round=${memory.round} kind=${memory.kind} timing=${memory.timing ?? "-"}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "plan failed";
      emit(`  skip: ${message}`);
    }
  }

  const wouldWrite = planned.filter((e) => {
    const key = memoryKey(e);
    return !existing.some((r) => r.key === key);
  }).length;

  if (existing.length + wouldWrite > memoryMaxTotal()) {
    emitErr(
      `cap would be exceeded: existing=${existing.length} + new=${wouldWrite} > max=${memoryMaxTotal()}`,
    );
    if (args.write) process.exit(1);
  }

  if (args.dryRun) {
    emit("dry-run: sending nothing");
    emit(`total on ${networkLabel}: ${existing.length} (rules need 10 on mainnet)`);
    return;
  }

  if (memNet === "mainnet") {
    const ok = await confirmMainnet(wouldWrite);
    if (!ok) {
      emitErr("refuses: MAINNET confirmation not typed");
      process.exit(1);
    }
  }

  resetWriterRunState();
  const namespace = `kolo:${circleId}`;
  const client = await getMemory(namespace);
  const rows: LedgerRow[] = [];

  const items = planned
    .map((event) => {
      const key = memoryKey(event);
      if (existing.some((r) => r.key === key) || rows.some((r) => r.key === key)) {
        return null;
      }
      const built = toMemory(event, events);
      return { event, built, key };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, memoryMaxPerRun());

  if (typeof client.rememberBulkAndWait === "function" && items.length > 0) {
    try {
      const bulk = await client.rememberBulkAndWait(
        items.map((i) => ({ text: i.built.text, namespace: i.built.namespace })),
        { timeoutMs: 120_000 },
      );
      bulk.results.forEach((res, idx) => {
        const item = items[idx];
        if (!item || res.status !== "done" || !res.blob_id) return;
        const writtenAt = new Date().toISOString();
        const row: LedgerRow = {
          key: item.key,
          circleId: item.built.memory.circleId,
          round: item.built.memory.round,
          member: item.built.memory.member,
          kind: item.built.memory.kind,
          timing: item.built.memory.timing,
          txDigest: item.built.memory.txDigest,
          blobId: res.blob_id,
          memoryId: res.id,
          network: networkLabel,
          writtenAt,
          points: 5,
          link: walruscanBlobLink(networkLabel, res.blob_id),
        };
        appendLedgerRow(row);
        rows.push(row);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "bulk failed";
      if (/\b429\b|rate.?limit/i.test(message)) {
        emitErr(`rate limited after ${rows.length} written`);
      } else {
        emitErr(`bulk failed, falling back one-by-one: ${message}`);
        for (const item of items) {
          const result = await writeMemory(item.event, { allEvents: events, client });
          if (result.status === "written") rows.push(result.row);
          if (result.status === "rate_limited") {
            emitErr(`rate limited after ${result.written} written`);
            break;
          }
          await sleep(2000);
        }
      }
    }
  } else {
    for (const item of items) {
      const result = await writeMemory(item.event, { allEvents: events, client });
      if (result.status === "written") rows.push(result.row);
      if (result.status === "rate_limited") {
        emitErr(`rate limited after ${result.written} written`);
        break;
      }
      await sleep(2000);
    }
  }

  emit("blobId\tlink");
  for (const row of rows) {
    emit(`${row.blobId}\t${row.link}`);
  }
  const total = readLedger(networkLabel).length;
  emit(`total on ${networkLabel}: ${total} (rules need 10 on mainnet)`);
  emit(`memory: ${rows.length} written`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "memory:demo failed";
  emitErr(message);
  process.exit(1);
});
