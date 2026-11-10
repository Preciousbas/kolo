import { describe, expect, it } from "vitest";
import { assertNoPii, toMemory } from "../lib/memory-record";
import type { KoloEvent } from "../lib/feed";

const base: KoloEvent = {
  kind: "contributed",
  circleId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  round: 1,
  member: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  amountRaw: "20000000",
  coinType: "0x2::usdc::USDC",
  decimals: 6,
  roundComplete: false,
  txDigest: "digestPay1",
  checkpoint: "1",
  timestampMs: 1_700_000_000_000,
  explorerUrl: "",
  via: "graphql",
};

describe("toMemory", () => {
  it("maps paid on time", () => {
    const completing: KoloEvent = {
      ...base,
      member: "0x1111111111111111111111111111111111111111111111111111111111111111",
      roundComplete: true,
      txDigest: "digestLast",
      timestampMs: 1_700_000_100_000,
    };
    const { memory, text } = toMemory(base, [base, completing]);
    expect(memory.kind).toBe("paid");
    expect(memory.timing).toBe("on_time");
    expect(memory.escrowNetwork).toBe("testnet");
    expect(text).toMatch(/on time/);
    expect(text).toContain('"v":1');
  });

  it("maps paid late", () => {
    const completing: KoloEvent = {
      ...base,
      member: "0x1111111111111111111111111111111111111111111111111111111111111111",
      roundComplete: true,
      txDigest: "digestLast",
      timestampMs: 1_700_000_050_000,
    };
    const late: KoloEvent = {
      ...base,
      txDigest: "digestLate",
      timestampMs: 1_700_000_080_000,
      roundComplete: false,
    };
    const { memory, text } = toMemory(late, [completing, late]);
    expect(memory.timing).toBe("late");
    expect(text).toMatch(/ late\./);
  });

  it("maps paid out with null timing", () => {
    const payout: KoloEvent = {
      ...base,
      kind: "paid_out",
      txDigest: "digestOut",
    };
    const { memory, text } = toMemory(payout, [payout]);
    expect(memory.kind).toBe("paid_out");
    expect(memory.timing).toBeNull();
    expect(text).toMatch(/paid out/);
  });

  it("rejects demo names, emails, and phones", () => {
    expect(() => assertNoPii("Emeka paid")).toThrow(/demo name/);
    expect(() => assertNoPii("mail me at a@b.co")).toThrow(/email/);
    expect(() => assertNoPii("call +1 555 123 4567")).toThrow(/phone/);
  });
});
