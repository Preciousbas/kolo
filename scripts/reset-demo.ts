import "../spike/load-env";
import {
  buildStateFromSeed,
  checkUsdcBalances,
  checkWallet0,
  createDemoCircle,
  emit,
  emitErr,
  getCoinType,
  getDemoKeypairs,
  requireSeedEnv,
  seedToDefaultState,
  shareGas,
  writeDemoState,
} from "./demo-lib";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  let packageId: string;
  let mnemonic: string;
  try {
    ({ packageId, mnemonic } = requireSeedEnv());
  } catch (error) {
    const message = error instanceof Error ? error.message : "reset failed";
    // requireSeedEnv already prints missing names for missing env; map testnet refuse
    if (message.includes("testnet only")) {
      emitErr(message.replace(/^seed /, "reset "));
    } else if (!message.startsWith("missing ")) {
      emitErr(message);
    }
    process.exit(1);
  }

  const coinType = getCoinType();
  const keys = getDemoKeypairs(mnemonic);
  const members = keys.map((k) => k.getPublicKey().toSuiAddress());

  emit("reset plan:");
  emit("- create a new circle (never touch the old one)");
  emit("- same 6 members, auto payout on, 20 USDC each");
  emit("- seed to default: round 3, 4 of 6 paid, recipient Bisi");
  emit(`- packageId=${packageId}`);
  emit(`- members=${members.length}`);
  emit(`- coinType=${coinType}`);
  emit(`- dryRun=${dryRun}`);

  if (dryRun) {
    emit("dry-run: sending nothing");
    return;
  }

  await checkWallet0(keys);
  await checkUsdcBalances(keys, coinType);
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
  emit("put KOLO_DEMO_CIRCLE_ID into Vercel yourself");
  emit("wrote data/demo-state.json");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "reset failed";
  emitErr(message);
  process.exit(1);
});
