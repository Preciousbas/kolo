import "../spike/load-env";
import { isMock } from "../lib/config";
import { syncMemories } from "../lib/memory-sync";
import {
  buildStateFromSeed,
  checkUsdcBalances,
  checkWallet0,
  CONTRIBUTION_BASE,
  contributeWithAmount,
  createDemoCircle,
  emit,
  emitErr,
  explorerTx,
  getCoinType,
  getDemoKeypairs,
  loadDemoState,
  requireSeedEnv,
  seedToDefaultState,
  shareGas,
  writeDemoState,
} from "./demo-lib";

async function syncDemoMemories(circleId: string, packageId: string) {
  try {
    const result = await syncMemories(circleId, { packageId });
    if (result.mock || isMock()) {
      emit(`memory: mock`);
    } else {
      emit(`memory: ${result.written} written`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "memory sync failed";
    emit(`memory: skipped (${message})`);
  }
}

async function main() {
  const finishRound = process.argv.includes("--finish-round");

  let packageId: string;
  let mnemonic: string;
  try {
    ({ packageId, mnemonic } = requireSeedEnv());
  } catch (error) {
    const message = error instanceof Error ? error.message : "seed failed";
    emitErr(message);
    process.exit(1);
  }

  const coinType = getCoinType();
  const keys = getDemoKeypairs(mnemonic);
  await checkWallet0(keys);
  await checkUsdcBalances(keys, coinType);

  emit(`packageId=set`);
  emit(`KOLO_SEED_MNEMONIC=set`);
  emit(`finishRound=${finishRound}`);

  if (finishRound) {
    const existing = loadDemoState();
    if (!existing.circleId) {
      emitErr("missing circleId in data/demo-state.json; run seed:demo first");
      process.exit(1);
    }
    const circleId = existing.circleId;
    emit(`circleId=${circleId}`);

    const femi = await contributeWithAmount({
      key: keys[4],
      circleId,
      amount: CONTRIBUTION_BASE,
      packageId,
      coinType,
    });
    const tunde = await contributeWithAmount({
      key: keys[5],
      circleId,
      amount: CONTRIBUTION_BASE,
      packageId,
      coinType,
    });
    emit(`payout digest=${tunde} ${explorerTx(tunde)}`);

    const digests = [...(existing.digests ?? []), femi, tunde];
    const state = buildStateFromSeed({
      circleId,
      packageId,
      keys,
      digests,
      finishRound: true,
    });
    writeDemoState(state);
    emit(`KOLO_DEMO_CIRCLE_ID=${circleId}`);
    emit(`wrote data/demo-state.json`);
    await syncDemoMemories(circleId, packageId);
    return;
  }

  await shareGas(keys);
  const created = await createDemoCircle({ keys, packageId, coinType });
  const seeded = await seedToDefaultState({
    keys,
    circleId: created.circleId,
    packageId,
    coinType,
    finishRound: false,
  });
  const digests = [created.digest, ...seeded.digests];
  const state = buildStateFromSeed({
    circleId: created.circleId,
    packageId,
    keys,
    digests,
    finishRound: false,
  });
  writeDemoState(state);
  emit(`KOLO_DEMO_CIRCLE_ID=${created.circleId}`);
  emit(`wrote data/demo-state.json`);
  await syncDemoMemories(created.circleId, packageId);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "seed failed";
  emitErr(message);
  process.exit(1);
});
