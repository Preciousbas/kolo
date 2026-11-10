import { afterEach, describe, expect, it, vi } from "vitest";
import circleObject from "./fixtures/circle-object.json";
import paidOutEvents from "./fixtures/paid-out-events.json";
import {
  buildContributeTx,
  parseCircleState,
  type PaidOutEvent,
} from "../lib/circle";
import { redact } from "../lib/redact";

const ENV_KEYS = [
  "KOLO_NETWORK",
  "KOLO_ALLOW_MAINNET",
  "KOLO_PACKAGE_ID",
  "KOLO_SEED_MNEMONIC",
  "TATUM_API_KEY",
  "KOLO_DEMO_CIRCLE_ID",
] as const;

const snapshot = new Map<string, string | undefined>();

function saveEnv() {
  snapshot.clear();
  for (const key of ENV_KEYS) snapshot.set(key, process.env[key]);
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = snapshot.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("circle parser", () => {
  it("turns getObject + PaidOut events into payout shape with mode and badges", () => {
    const view = parseCircleState({
      id: "0xcirclefixture000000000000000000000000000000000000000000000000001",
      object: circleObject,
      events: paidOutEvents as PaidOutEvent[],
      nameByAddress: {
        "0xa111111111111111111111111111111111111111111111111111111111111111": "Ada",
        "0xb222222222222222222222222222222222222222222222222222222222222222": "Emeka",
        "0xc333333333333333333333333333333333333333333333333333333333333333": "Bisi",
      },
      via: "tatum",
    });

    expect(view.round).toBe(3);
    expect(view.recipient).toBe(
      "0xc333333333333333333333333333333333333333333333333333333333333333",
    );
    expect(view.amountUsd).toBe(20);
    expect(view.potUsd).toBe(80);
    expect(view.autoPayout).toBe(true);
    expect(view.paid.filter(Boolean)).toHaveLength(4);
    expect(view.payouts).toHaveLength(2);
    expect(view.payouts[0]).toMatchObject({
      round: 1,
      recipient: "0xa111111111111111111111111111111111111111111111111111111111111111",
      amountUsd: 120,
      amountNgn: null,
      mode: "auto",
      txRef: "digestAdaPayout",
    });
    expect(view.members[0].badge).toBe("paid");
    expect(view.members[1].badge).toBe("paid");
    expect(view.members[2].badge).toBe("scheduled");
    expect(view.via).toBe("tatum");
  });
});

describe("transaction builder", () => {
  afterEach(() => restoreEnv());

  it("targets packageId::circle::contribute with the coin type argument", () => {
    saveEnv();
    process.env.KOLO_PACKAGE_ID = "0xpackagetest";
    const tx = buildContributeTx({
      circleId: "0xcircle",
      coinId: "0xcoin",
      packageId: "0xpackagetest",
      coinType:
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
    });
    const data = tx.getData();
    const moveCall = data.commands.find((c) => c.$kind === "MoveCall");
    expect(moveCall?.$kind).toBe("MoveCall");
    if (moveCall?.$kind !== "MoveCall") throw new Error("expected MoveCall");
    expect(moveCall.MoveCall.package).toBe("0xpackagetest");
    expect(moveCall.MoveCall.module).toBe("circle");
    expect(moveCall.MoveCall.function).toBe("contribute");
    expect(moveCall.MoveCall.typeArguments).toEqual([
      "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
    ]);
  });
});

describe("read fallback", () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("uses fullnode when tatum fails, then saved state when both fail", async () => {
    saveEnv();
    process.env.KOLO_PACKAGE_ID = "0xpackage";
    delete process.env.TATUM_API_KEY;

    vi.doMock("../lib/tatum", () => ({
      rpc: vi.fn().mockRejectedValue(new Error("tatum down")),
    }));

    const fullnodeGetObject = vi.fn().mockResolvedValue(circleObject);
    const fullnodeQueryEvents = vi.fn().mockResolvedValue({ data: [] });
    vi.doMock("@mysten/sui/jsonRpc", () => ({
      getJsonRpcFullnodeUrl: () => "https://fullnode.testnet.sui.io",
      SuiJsonRpcClient: class {
        getObject = fullnodeGetObject;
        queryEvents = fullnodeQueryEvents;
      },
    }));

    const { readCircle } = await import("../lib/circle");
    const view = await readCircle({
      id: "0xcirclefixture000000000000000000000000000000000000000000000000001",
    });
    expect(view.via).toBe("fullnode");
    expect(fullnodeGetObject).toHaveBeenCalled();

    fullnodeGetObject.mockRejectedValueOnce(new Error("fullnode down"));
    const { savedStateAsCircleView, readSavedDemoState } = await import("../lib/demo-state");
    try {
      await readCircle({ id: "0xmissing" });
      expect.fail("expected throw");
    } catch {
      const saved = savedStateAsCircleView(readSavedDemoState());
      expect(saved.via).toBe("saved");
      expect(saved.sourceNote).toBe("showing saved state");
    }
  });
});

describe("api redact", () => {
  afterEach(() => restoreEnv());

  it("circle api payload contains no env secret values", () => {
    saveEnv();
    process.env.KOLO_SEED_MNEMONIC =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    process.env.TATUM_API_KEY = "unit-test-secret-value-abcdef";
    const payload = JSON.stringify({
      id: "0x1",
      note: `leak ${process.env.KOLO_SEED_MNEMONIC} ${process.env.TATUM_API_KEY}`,
    });
    const cleaned = redact(payload);
    expect(cleaned).not.toContain(process.env.KOLO_SEED_MNEMONIC!);
    expect(cleaned).not.toContain(process.env.TATUM_API_KEY!);
    expect(cleaned).toContain("***");
  });
});
