import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createdFix from "./fixtures/tatum/graphql-events-created.json";
import contribFix from "./fixtures/tatum/graphql-events-contributed.json";
import paidFix from "./fixtures/tatum/graphql-events-paid-out.json";
import {
  buildRoundCompleteMap,
  classifyTiming,
  parseGraphqlEventsPayload,
} from "../lib/feed";
import { clearPriceCache, toNaira } from "../lib/price";
import { clearTatumCaches, withTatumFallback } from "../lib/tatum";

const CIRCLE = "0xcirclefixture000000000000000000000000000000000000000000000000001";
const PKG = "0xpackage";

describe("feed parser", () => {
  it("parses Created, Contributed, PaidOut into KoloEvent[]", () => {
    const created = parseGraphqlEventsPayload(createdFix, {
      circleId: CIRCLE,
      eventType: `${PKG}::circle::Created`,
    });
    const contrib = parseGraphqlEventsPayload(contribFix, {
      circleId: CIRCLE,
      eventType: `${PKG}::circle::Contributed`,
    });
    const paid = parseGraphqlEventsPayload(paidFix, {
      circleId: CIRCLE,
      eventType: `${PKG}::circle::PaidOut`,
    });

    expect(created.events).toHaveLength(1);
    expect(created.events[0].kind).toBe("created");
    expect(created.events[0].auto).toBe(true);
    expect(created.events[0].explorerUrl).toContain("/tx/DigestCreated111");

    expect(contrib.events).toHaveLength(2);
    expect(contrib.nextCursor).toBe("cursor-contrib-1");
    expect(contrib.events[0].kind).toBe("contributed");
    expect(contrib.events[0].round).toBe(1);
    expect(contrib.events[1].roundComplete).toBe(true);

    expect(paid.events).toHaveLength(1);
    expect(paid.events[0].kind).toBe("paid_out");
    expect(paid.events[0].round).toBe(1);
    expect(paid.events[0].member).toContain("0xa111");
    expect(paid.events[0].auto).toBe(true);
  });

  it("classifyTiming: on time, late, and last payer", () => {
    const contrib = parseGraphqlEventsPayload(contribFix, {
      circleId: CIRCLE,
      eventType: `${PKG}::circle::Contributed`,
    }).events;
    const late = {
      ...contrib[0],
      timestampMs: contrib[1].timestampMs + 5_000,
      roundComplete: false,
      member: "0xlate",
    };
    const all = [...contrib, late];
    const map = buildRoundCompleteMap(all);

    expect(classifyTiming({ event: contrib[0], roundCompleteAt: map })).toBe("on_time");
    expect(classifyTiming({ event: contrib[1], roundCompleteAt: map })).toBe("last");
    expect(classifyTiming({ event: late, roundCompleteAt: map })).toBe("late");
  });
});

describe("tatum fallback order", () => {
  afterEach(() => {
    clearTatumCaches();
    vi.unstubAllGlobals();
    delete process.env.TATUM_API_KEY;
  });

  it("GraphQL 500 → gRPC → JSON-RPC 404 → fullnode, with via correct", async () => {
    const calls: string[] = [];
    const result = await withTatumFallback({
      graphql: async () => {
        calls.push("graphql");
        throw new Error("HTTP 500");
      },
      grpc: async () => {
        calls.push("grpc");
        throw new Error("grpc down");
      },
      jsonrpc: async () => {
        calls.push("jsonrpc");
        throw Object.assign(new Error("HTTP 404"), { status: 404 });
      },
      fullnode: async () => {
        calls.push("fullnode");
        return { data: { ok: true }, via: "fullnode" as const, ms: 1 };
      },
    });
    expect(calls).toEqual(["graphql", "grpc", "jsonrpc", "fullnode"]);
    expect(result.via).toBe("fullnode");
    expect(result.data).toEqual({ ok: true });
  });

  it("401 maps to bad-key and never leaks the key", async () => {
    process.env.TATUM_API_KEY = "test-key-123";
    process.env.KOLO_NETWORK = "testnet";
    const outputs: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 401 })),
    );

    const { tatumGraphql, TatumTransportError } = await import("../lib/tatum");
    try {
      await tatumGraphql("{ checkpoint { sequenceNumber } }");
    } catch (error) {
      expect(error).toBeInstanceOf(TatumTransportError);
      const err = error as InstanceType<typeof TatumTransportError>;
      expect(err.code).toBe("bad-key");
      outputs.push(err.message, String(err), err.stack || "");
    }
    const joined = outputs.join("\n");
    expect(joined).not.toContain("test-key-123");
    expect(joined).not.toContain("x-api-key");
  });
});

describe("price cache", () => {
  beforeEach(() => {
    clearPriceCache();
    clearTatumCaches();
    vi.unstubAllGlobals();
    delete process.env.TATUM_API_KEY;
  });

  afterEach(() => {
    clearPriceCache();
    vi.unstubAllGlobals();
    delete process.env.TATUM_API_KEY;
  });

  it("cache hit within 5 minutes", async () => {
    process.env.TATUM_API_KEY = "unit-test-secret-value";
    let hits = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/v4/data/rate")) {
          hits += 1;
          return new Response(
            JSON.stringify({ value: "1500", basePair: "NGN", timestamp: "2026-11-01T00:00:00Z" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("no", { status: 404 });
      }),
    );

    const a = await toNaira(20);
    const b = await toNaira(20);
    expect(a.amountNgn).toBe(30_000);
    expect(b.amountNgn).toBe(30_000);
    expect(hits).toBe(1);
    expect(a.priceAt).toBeTruthy();
  });

  it("NGN missing → USD only", async () => {
    process.env.TATUM_API_KEY = "unit-test-secret-value";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
    const priced = await toNaira(20);
    expect(priced.amountNgn).toBeNull();
    expect(priced.usdAmount).toBe(20);
    expect(priced.note).toMatch(/naira price unavailable/i);
  });
});

describe("routes with no env return source saved", () => {
  afterEach(() => {
    delete process.env.TATUM_API_KEY;
    delete process.env.KOLO_NETWORK;
    delete process.env.KOLO_PACKAGE_ID;
    delete process.env.KOLO_DEMO_CIRCLE_ID;
  });

  it("GET /api/circles/[id] returns source saved", async () => {
    vi.resetModules();
    const { GET } = await import("../app/api/circles/[id]/route");
    const res = await GET(new Request("http://localhost/api/circles/demo"), {
      params: Promise.resolve({ id: "demo" }),
    });
    const body = await res.json();
    expect(body.source).toBe("saved");
  });

  it("GET /api/circles/[id]/events returns source saved", async () => {
    vi.resetModules();
    const { GET } = await import("../app/api/circles/[id]/events/route");
    const res = await GET(new Request("http://localhost/api/circles/demo/events"), {
      params: Promise.resolve({ id: "demo" }),
    });
    const body = await res.json();
    expect(body.source).toBe("saved");
    expect(Array.isArray(body.events)).toBe(true);
  });

  it("GET /api/members/[address]/history returns source saved", async () => {
    vi.resetModules();
    const { GET } = await import("../app/api/members/[address]/history/route");
    const res = await GET(
      new Request("http://localhost/api/members/0xabc/history?circle=demo"),
      { params: Promise.resolve({ address: "0xabc" }) },
    );
    const body = await res.json();
    expect(body.source).toBe("saved");
  });
});
