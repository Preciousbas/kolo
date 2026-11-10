import { describe, expect, it } from "vitest";
import { computeRoundPot } from "../lib/pot";

describe("computeRoundPot", () => {
  const contributionUsd = 20;

  it("pot is 0 when no members have paid", () => {
    const pot = computeRoundPot({
      paid: [false, false, false, false, false, false],
      contributionUsd,
    });
    expect(pot.paidCount).toBe(0);
    expect(pot.memberCount).toBe(6);
    expect(pot.potUsd).toBe(0);
    expect(pot.targetUsd).toBe(120);
  });

  it("partial pot is paidCount × contribution (4 of 6 → 80)", () => {
    const pot = computeRoundPot({
      paid: [true, true, true, true, false, false],
      contributionUsd,
    });
    expect(pot.paidCount).toBe(4);
    expect(pot.potUsd).toBe(80);
    expect(pot.targetUsd).toBe(120);
  });

  it("full pot equals the target when everyone paid", () => {
    const pot = computeRoundPot({
      paid: [true, true, true, true, true, true],
      contributionUsd,
    });
    expect(pot.paidCount).toBe(6);
    expect(pot.potUsd).toBe(120);
    expect(pot.targetUsd).toBe(120);
  });

  it("sums current-round contribution events when provided (1-indexed round)", () => {
    const pot = computeRoundPot({
      paid: [true, true, false, false, false, false],
      contributionUsd,
      round: 3,
      events: [
        { kind: "contributed", round: 2, amountRaw: "20000000" }, // prior round ignored
        { kind: "contributed", round: 3, amountRaw: "20000000" },
        { kind: "contributed", round: 3, amountRaw: "20000000" },
        { kind: "paid_out", round: 2, amountRaw: "120000000" },
      ],
    });
    // Events for round 3 win over the paid-flag estimate.
    expect(pot.potUsd).toBe(40);
    expect(pot.targetUsd).toBe(120);
  });

  it("uses the same round index as the UI (events round N with UI round N)", () => {
    const uiRound = 3;
    const pot = computeRoundPot({
      paid: [true, true, true, true, false, false],
      contributionUsd,
      round: uiRound,
      events: [
        { kind: "contributed", round: 0, amountRaw: "20000000" }, // 0-based would not match
        { kind: "contributed", round: 3, amountRaw: "20000000" },
        { kind: "contributed", round: 3, amountRaw: "20000000" },
        { kind: "contributed", round: 3, amountRaw: "20000000" },
        { kind: "contributed", round: 3, amountRaw: "20000000" },
      ],
    });
    expect(pot.potUsd).toBe(80);
  });
});

describe("pot naira conversion", () => {
  it("converts potUsd with a known rate and leaves null when rate missing", async () => {
    const { toNaira, clearPriceCache } = await import("../lib/price");
    clearPriceCache();
    process.env.TATUM_API_KEY = "unit-test-secret-value";
    const { vi } = await import("vitest");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/v4/data/rate")) {
          return new Response(
            JSON.stringify({ value: "1500", basePair: "NGN", timestamp: "2026-11-01T00:00:00Z" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("no", { status: 404 });
      }),
    );
    const priced = await toNaira(80);
    expect(priced.amountNgn).toBe(120_000);
    clearPriceCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
    const missing = await toNaira(80);
    expect(missing.amountNgn).toBeNull();
    vi.unstubAllGlobals();
    delete process.env.TATUM_API_KEY;
  });
});
