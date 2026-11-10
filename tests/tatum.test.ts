import { afterEach, describe, expect, it, vi } from "vitest";
import { latestCheckpoint } from "../lib/tatum";

describe("tatum", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KOLO_NETWORK;
    delete process.env.TATUM_API_KEY;
  });

  it("falls back to GraphQL when JSON-RPC rejects", async () => {
    process.env.KOLO_NETWORK = "testnet";
    process.env.TATUM_API_KEY = "unit-test-secret-value";
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        urls.push(url);
        if (url.includes("/graphql")) {
          return new Response(
            JSON.stringify({ data: { checkpoint: { sequenceNumber: 42 } } }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("missing", { status: 404 });
      }),
    );

    const checkpoint = await latestCheckpoint();
    expect(checkpoint.via).toBe("graphql");
    expect(checkpoint.seq).toBe("42");
    expect(checkpoint.jsonrpcStatus).toBe(404);
    expect(urls[0]).toContain("sui-testnet.gateway.tatum.io");
    expect(urls[0]).not.toContain("/graphql");
    expect(urls[1]).toContain("/graphql");
  });
});
