import { getNetworkName, isMock, tatumApiKey } from "@/lib/config";
import { escrowHealth } from "@/lib/demo-state";
import { latestCheckpoint, probeTatumInterfaces } from "@/lib/tatum";

export const dynamic = "force-dynamic";

export async function GET() {
  let network = "testnet";
  try {
    network = getNetworkName();
  } catch (error) {
    const message = error instanceof Error ? error.message : "network locked";
    return Response.json({ error: message }, { status: 500 });
  }

  let tatum: "ok" | "error" | "no-key" = tatumApiKey() ? "error" : "no-key";
  let checkpoint: { seq: string; via: "jsonrpc" | "graphql" } | null = null;
  let tatumDetail: {
    graphql: "ok" | "error" | "no-key" | "skipped";
    grpc: "ok" | "error" | "no-key" | "skipped";
    jsonrpc: "ok" | "error" | "no-key" | "skipped";
  } = { graphql: "no-key", grpc: "no-key", jsonrpc: "no-key" };

  if (tatumApiKey()) {
    try {
      tatumDetail = await probeTatumInterfaces();
      const found = await latestCheckpoint();
      // GraphQL is the health signal; gRPC is optional and reported as skipped.
      tatum = tatumDetail.graphql === "ok" ? "ok" : "error";
      checkpoint = { seq: found.seq, via: found.via };
    } catch {
      tatum = "error";
      try {
        tatumDetail = await probeTatumInterfaces();
      } catch {
        // keep defaults
      }
    }
  }

  return Response.json({
    network,
    tatum,
    tatumDetail,
    memory: isMock() ? "mock" : "real",
    checkpoint,
    escrow: escrowHealth(),
  });
}
