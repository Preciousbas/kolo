import "./load-env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import {
  assertTestnetOnly,
  getCoinType,
  getPackageId,
  getWallet0Address,
  USDC_TYPE,
} from "../lib/config";
import {
  buildContributeTx,
  buildCreateTx,
  getDemoKeypairs,
  usdcFromBase,
} from "../lib/circle";
import { redact } from "../lib/redact";
import { getGrpcClient, unwrapTx } from "../lib/sui-client";

export const CONTRIBUTION_USD = 20;
export const CONTRIBUTION_BASE = CONTRIBUTION_USD * 1_000_000;
export const NEED_USDC_BASE = 60 * 1_000_000;
export const GAS_SHARE_MIST = BigInt(50_000_000); // 0.05 SUI each

export type DemoCircleMeta = {
  name: string;
  contributionUsd: number;
  autoPayout: boolean;
  members: { name: string; index: number }[];
};

export type DemoState = {
  circleId: string;
  packageId: string;
  name: string;
  network: "testnet";
  coinType: string;
  contributionUsd: number;
  autoPayout: boolean;
  round: number;
  paidCount: number;
  memberCount: number;
  recipientName: string;
  members: { name: string; address: string; index: number }[];
  paidThisRound: boolean[];
  payouts: {
    round: number;
    recipient: string;
    amountUsd: number;
    amountNgn: null;
    paidAt: string | null;
    txRef: string;
    mode: "auto" | "manual";
  }[];
  digests: string[];
  updatedAt: string | null;
  note?: string;
};

export function emit(line: string) {
  process.stdout.write(`${redact(line)}\n`);
}

export function emitErr(line: string) {
  process.stderr.write(`${redact(line)}\n`);
}

export function rootPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

export function loadDemoMeta(): DemoCircleMeta {
  return JSON.parse(readFileSync(rootPath("data/demo-circle.json"), "utf8")) as DemoCircleMeta;
}

export function loadDemoState(): DemoState {
  return JSON.parse(readFileSync(rootPath("data/demo-state.json"), "utf8")) as DemoState;
}

export function writeDemoState(state: DemoState) {
  writeFileSync(rootPath("data/demo-state.json"), `${JSON.stringify(state, null, 2)}\n`);
}

export function explorerTx(digest: string) {
  return `https://suiscan.xyz/testnet/tx/${digest}`;
}

export function requireSeedEnv(action = "seed"): { packageId: string; mnemonic: string } {
  try {
    assertTestnetOnly(action);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${action} is testnet only`;
    emit(message);
    process.exit(1);
  }
  const missing: string[] = [];
  const packageId = getPackageId();
  const mnemonic = process.env.KOLO_SEED_MNEMONIC;
  if (!packageId) missing.push("KOLO_PACKAGE_ID");
  if (!mnemonic) missing.push("KOLO_SEED_MNEMONIC");
  if (missing.length) {
    for (const name of missing) emit(`missing ${name}`);
    process.exit(1);
  }
  return { packageId: packageId!, mnemonic: mnemonic! };
}

let cachedClient: SuiGrpcClient | null = null;
let cachedVia: "tatum" | "grpc" | "graphql" | "saved" | null = null;

export async function client(): Promise<SuiGrpcClient> {
  if (!cachedClient) {
    const resolved = await getGrpcClient();
    cachedClient = resolved.client;
    cachedVia = resolved.via;
    emit(`sui client via=${cachedVia}`);
  }
  return cachedClient;
}

export async function checkWallet0(keys: Ed25519Keypair[]) {
  if (process.env.KOLO_SUI_MOCK === "1") return;
  const derived = keys[0].getPublicKey().toSuiAddress();
  const expected = getWallet0Address();
  if (derived.toLowerCase() !== expected.toLowerCase()) {
    emit(`wallet 0 mismatch ${derived}`);
    process.exit(1);
  }
}

export async function checkUsdcBalances(
  keys: Ed25519Keypair[],
  coinType: string,
  opts?: { exitOnShort?: boolean },
) {
  const exitOnShort = opts?.exitOnShort !== false;
  const rows: { address: string; needed: string; has: string; ok: boolean }[] = [];
  let short = false;

  if (process.env.KOLO_SUI_MOCK === "1") {
    for (const key of keys) {
      rows.push({
        address: key.getPublicKey().toSuiAddress(),
        needed: String(NEED_USDC_BASE),
        has: String(NEED_USDC_BASE),
        ok: true,
      });
    }
  } else {
    const c = await client();
    for (const key of keys) {
      const address = key.getPublicKey().toSuiAddress();
      const bal = await c.getBalance({ owner: address, coinType });
      const has = BigInt(bal.balance.balance);
      const ok = has >= BigInt(NEED_USDC_BASE);
      if (!ok) short = true;
      rows.push({
        address,
        needed: String(NEED_USDC_BASE),
        has: String(has),
        ok,
      });
    }
  }

  emit("address\tneeded\thas\tok");
  for (const row of rows) {
    emit(`${row.address}\t${row.needed}\t${row.has}\t${row.ok ? "yes" : "no"}`);
  }
  if (short && exitOnShort) {
    emit("claim at https://faucet.circle.com (Sui Testnet)");
    process.exit(1);
  }
}

function createdObjectId(
  effects: { changedObjects?: { objectId: string; idOperation: string }[] } | undefined,
  objectTypes: Record<string, string> | undefined,
  typeIncludes: string,
): string | null {
  const changed = effects?.changedObjects ?? [];
  for (const ch of changed) {
    if (ch.idOperation !== "Created") continue;
    const type = objectTypes?.[ch.objectId] ?? "";
    if (typeIncludes === "" || type.includes(typeIncludes)) return ch.objectId;
  }
  return null;
}

export async function shareGas(keys: Ed25519Keypair[]) {
  const c = await client();
  const from = keys[0];
  const tx = new Transaction();
  const amounts = keys.slice(1).map(() => GAS_SHARE_MIST);
  const coins = tx.splitCoins(tx.gas, amounts.map((a) => tx.pure.u64(a)));
  keys.slice(1).forEach((key, i) => {
    tx.transferObjects([coins[i]], key.getPublicKey().toSuiAddress());
  });
  emit(`gas share mist each=${GAS_SHARE_MIST.toString()} recipients=${keys.length - 1}`);
  const result = await c.signAndExecuteTransaction({
    signer: from,
    transaction: tx,
    include: { effects: true },
  });
  const executed = unwrapTx(result);
  await c.waitForTransaction({ digest: executed.digest });
  emit(`gas share digest=${executed.digest} ${explorerTx(executed.digest)}`);
  return executed.digest;
}

export async function contributeWithAmount(args: {
  key: Ed25519Keypair;
  circleId: string;
  amount: number;
  packageId: string;
  coinType: string;
}): Promise<string> {
  const c = await client();
  const owner = args.key.getPublicKey().toSuiAddress();
  const coins = await c.listCoins({ owner, coinType: args.coinType });
  const exact = coins.objects.find((coin) => BigInt(coin.balance) === BigInt(args.amount));
  let coinId: string;
  if (exact) {
    coinId = exact.objectId;
  } else {
    const big = coins.objects.find((coin) => BigInt(coin.balance) >= BigInt(args.amount));
    if (!big) throw new Error("insufficient USDC");
    const splitTx = new Transaction();
    const [split] = splitTx.splitCoins(splitTx.object(big.objectId), [
      splitTx.pure.u64(args.amount),
    ]);
    splitTx.transferObjects([split], owner);
    const splitResult = await c.signAndExecuteTransaction({
      signer: args.key,
      transaction: splitTx,
      include: { effects: true, objectTypes: true },
    });
    const splitTxResult = unwrapTx(splitResult);
    await c.waitForTransaction({ digest: splitTxResult.digest });
    const created = createdObjectId(splitTxResult.effects, splitTxResult.objectTypes, "");
    if (!created) throw new Error("split coin missing");
    coinId = created;
  }

  const tx = buildContributeTx({
    circleId: args.circleId,
    coinId,
    coinType: args.coinType,
    packageId: args.packageId,
  });
  const result = await c.signAndExecuteTransaction({
    signer: args.key,
    transaction: tx,
    include: { effects: true, events: true },
  });
  const executed = unwrapTx(result);
  await c.waitForTransaction({ digest: executed.digest });
  emit(`contribute digest=${executed.digest} ${explorerTx(executed.digest)}`);
  return executed.digest;
}

export async function createDemoCircle(args: {
  keys: Ed25519Keypair[];
  packageId: string;
  coinType: string;
}): Promise<{ circleId: string; digest: string }> {
  const c = await client();
  const members = args.keys.map((k) => k.getPublicKey().toSuiAddress());
  const tx = buildCreateTx({
    members,
    amount: CONTRIBUTION_BASE,
    autoPayout: true,
    coinType: args.coinType,
    packageId: args.packageId,
  });
  const result = await c.signAndExecuteTransaction({
    signer: args.keys[0],
    transaction: tx,
    include: { effects: true, objectTypes: true, events: true },
  });
  const executed = unwrapTx(result);
  await c.waitForTransaction({ digest: executed.digest });
  const circleId = createdObjectId(
    executed.effects,
    executed.objectTypes,
    "::circle::Circle",
  );
  if (!circleId) {
    throw new Error("circle object not found in create result");
  }
  emit(`create digest=${executed.digest} ${explorerTx(executed.digest)}`);
  emit(`circleId=${circleId}`);
  return { circleId, digest: executed.digest };
}

export async function seedToDefaultState(args: {
  keys: Ed25519Keypair[];
  circleId: string;
  packageId: string;
  coinType: string;
  finishRound?: boolean;
}): Promise<{ digests: string[]; payoutDigests: string[] }> {
  const digests: string[] = [];
  const payoutDigests: string[] = [];
  const order = [0, 1, 2, 3, 4, 5];

  // rounds 1 and 2 fully
  for (let round = 0; round < 2; round += 1) {
    for (const i of order) {
      const digest = await contributeWithAmount({
        key: args.keys[i],
        circleId: args.circleId,
        amount: CONTRIBUTION_BASE,
        packageId: args.packageId,
        coinType: args.coinType,
      });
      digests.push(digest);
      if (i === 5) payoutDigests.push(digest);
    }
  }

  // round 3: first 4 members
  for (const i of [0, 1, 2, 3]) {
    digests.push(
      await contributeWithAmount({
        key: args.keys[i],
        circleId: args.circleId,
        amount: CONTRIBUTION_BASE,
        packageId: args.packageId,
        coinType: args.coinType,
      }),
    );
  }

  if (args.finishRound) {
    digests.push(
      await contributeWithAmount({
        key: args.keys[4],
        circleId: args.circleId,
        amount: CONTRIBUTION_BASE,
        packageId: args.packageId,
        coinType: args.coinType,
      }),
    );
    const last = await contributeWithAmount({
      key: args.keys[5],
      circleId: args.circleId,
      amount: CONTRIBUTION_BASE,
      packageId: args.packageId,
      coinType: args.coinType,
    });
    digests.push(last);
    payoutDigests.push(last);
    emit(`payout digest=${last} ${explorerTx(last)}`);
  }

  return { digests, payoutDigests };
}

export function buildStateFromSeed(args: {
  circleId: string;
  packageId: string;
  keys: Ed25519Keypair[];
  digests: string[];
  finishRound?: boolean;
}): DemoState {
  const meta = loadDemoMeta();
  const members = meta.members.map((m) => ({
    name: m.name,
    index: m.index,
    address: args.keys[m.index].getPublicKey().toSuiAddress(),
  }));
  const finish = Boolean(args.finishRound);
  return {
    circleId: args.circleId,
    packageId: args.packageId,
    name: meta.name,
    network: "testnet",
    coinType: getCoinType() || USDC_TYPE.testnet,
    contributionUsd: CONTRIBUTION_USD,
    autoPayout: true,
    round: finish ? 4 : 3,
    paidCount: finish ? 0 : 4,
    memberCount: 6,
    recipientName: finish ? "Ngozi (You)" : "Bisi",
    members,
    paidThisRound: finish
      ? [false, false, false, false, false, false]
      : [true, true, true, true, false, false],
    payouts: [
      {
        round: 1,
        recipient: "Ada",
        amountUsd: usdcFromBase(CONTRIBUTION_BASE * 6),
        amountNgn: null,
        paidAt: null,
        txRef: args.digests[5] ?? "",
        mode: "auto",
      },
      {
        round: 2,
        recipient: "Emeka",
        amountUsd: usdcFromBase(CONTRIBUTION_BASE * 6),
        amountNgn: null,
        paidAt: null,
        txRef: args.digests[11] ?? "",
        mode: "auto",
      },
      ...(finish
        ? [
            {
              round: 3,
              recipient: "Bisi",
              amountUsd: usdcFromBase(CONTRIBUTION_BASE * 6),
              amountNgn: null,
              paidAt: null,
              txRef: args.digests[args.digests.length - 1] ?? "",
              mode: "auto" as const,
            },
          ]
        : []),
    ],
    digests: args.digests,
    updatedAt: new Date().toISOString(),
    note: finish
      ? "Round 3 complete; Bisi received the pot."
      : "Default demo: round 3, 4 of 6 paid, recipient Bisi.",
  };
}

export { getDemoKeypairs, getCoinType, CONTRIBUTION_BASE as amountBase };
