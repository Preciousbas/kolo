import { afterEach, describe, expect, it, vi } from "vitest";
import circleObject from "./fixtures/circle-object.json";

const PKG = `0x${"ab".repeat(32)}`;
const CIRCLE = `0x${"cd".repeat(32)}`;

const grpcGetObject = vi.fn();
const grpcListEvents = vi.fn();
const gqlGetObject = vi.fn();
const gqlListEvents = vi.fn();

const grpcClient = {
  getObject: grpcGetObject,
  listEvents: grpcListEvents,
  getChainIdentifier: vi.fn().mockResolvedValue({ chainIdentifier: "test" }),
};

const gqlClient = {
  getObject: gqlGetObject,
  listEvents: gqlListEvents,
  getChainIdentifier: vi.fn().mockResolvedValue({ chainIdentifier: "test" }),
};

vi.mock("../lib/tatum", () => ({
  rpc: vi.fn().mockRejectedValue(new Error("tatum json-rpc unused")),
}));

vi.mock("../lib/sui-client", () => ({
  createTatumGrpc: () => grpcClient,
  createPublicGrpc: () => grpcClient,
  createTatumGraphql: () => gqlClient,
  createPublicGraphql: () => gqlClient,
  getGrpcClient: async () => {
    // First object read attempt fails → GraphQL path; second suite call succeeds via grpc.
    return { client: grpcClient, via: "grpc" as const };
  },
  getGraphqlClient: async () => ({ client: gqlClient, via: "graphql" as const }),
}));

afterEach(() => {
  grpcGetObject.mockReset();
  grpcListEvents.mockReset();
  gqlGetObject.mockReset();
  gqlListEvents.mockReset();
  delete process.env.KOLO_PACKAGE_ID;
  delete process.env.TATUM_API_KEY;
});

describe("circle read fallback", () => {
  it("uses grpc when getObject succeeds", async () => {
    process.env.KOLO_PACKAGE_ID = PKG;
    grpcGetObject.mockResolvedValue(circleObject);
    grpcListEvents.mockResolvedValue({ events: [] });

    vi.resetModules();
    const { readCircle } = await import("../lib/circle");
    const view = await readCircle({ id: CIRCLE });
    expect(view.via).toBe("grpc");
    expect(grpcGetObject).toHaveBeenCalled();
  });

  it("falls back to graphql when grpc getObject fails", async () => {
    process.env.KOLO_PACKAGE_ID = PKG;
    grpcGetObject.mockRejectedValue(new Error("grpc down"));
    gqlGetObject.mockResolvedValue(circleObject);
    gqlListEvents.mockResolvedValue({ events: [] });

    vi.resetModules();
    // Re-mock getGrpcClient to still return grpc client that fails on getObject
    const { readCircle } = await import("../lib/circle");
    const view = await readCircle({ id: CIRCLE });
    expect(view.via).toBe("graphql");
    expect(gqlGetObject).toHaveBeenCalled();
  });

  it("surfaces failure so callers can use saved state", async () => {
    process.env.KOLO_PACKAGE_ID = PKG;
    grpcGetObject.mockRejectedValue(new Error("grpc down"));
    gqlGetObject.mockRejectedValue(new Error("graphql down"));

    vi.resetModules();
    const { readCircle } = await import("../lib/circle");
    await expect(readCircle({ id: CIRCLE })).rejects.toThrow(/graphql down/);
    const { savedStateAsCircleView, readSavedDemoState } = await import("../lib/demo-state");
    const saved = savedStateAsCircleView(readSavedDemoState());
    expect(saved.via).toBe("saved");
  });
});
