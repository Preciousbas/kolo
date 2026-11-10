export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertNetworkAllowed } = await import("./lib/config");
    assertNetworkAllowed();
  }
}
