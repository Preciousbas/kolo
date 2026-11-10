import { Transaction } from "@mysten/sui/transactions";

export type CircleMoveFn = "create" | "contribute" | "payout" | "open" | "join" | "start";

export function packageTarget(fn: CircleMoveFn, packageId: string): string {
  if (!packageId) throw new Error("missing KOLO_PACKAGE_ID");
  return `${packageId}::circle::${fn}`;
}

export function buildCreateTx(args: {
  members: string[];
  amount: number;
  autoPayout: boolean;
  coinType: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("create", args.packageId),
    typeArguments: [args.coinType],
    arguments: [
      tx.pure.vector("address", args.members),
      tx.pure.u64(args.amount),
      tx.pure.bool(args.autoPayout),
    ],
  });
  return tx;
}

export function buildOpenTx(args: {
  maxMembers: number;
  amount: number;
  autoPayout: boolean;
  coinType: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("open", args.packageId),
    typeArguments: [args.coinType],
    arguments: [
      tx.pure.u64(args.maxMembers),
      tx.pure.u64(args.amount),
      tx.pure.bool(args.autoPayout),
    ],
  });
  return tx;
}

export function buildJoinTx(args: {
  circleId: string;
  coinType: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("join", args.packageId),
    typeArguments: [args.coinType],
    arguments: [tx.object(args.circleId)],
  });
  return tx;
}

export function buildStartTx(args: {
  circleId: string;
  coinType: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("start", args.packageId),
    typeArguments: [args.coinType],
    arguments: [tx.object(args.circleId)],
  });
  return tx;
}

export function buildContributeTx(args: {
  circleId: string;
  coinId: string;
  coinType: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("contribute", args.packageId),
    typeArguments: [args.coinType],
    arguments: [tx.object(args.circleId), tx.object(args.coinId)],
  });
  return tx;
}

export function buildPayoutTx(args: {
  circleId: string;
  coinType: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: packageTarget("payout", args.packageId),
    typeArguments: [args.coinType],
    arguments: [tx.object(args.circleId)],
  });
  return tx;
}
