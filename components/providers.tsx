"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig, useSuiClient } from "@mysten/dapp-kit";
import { registerEnokiWallets } from "@mysten/enoki";
import { useEffect, useState, type ReactNode } from "react";

const TESTNET_URL = "https://fullnode.testnet.sui.io:443";

const { networkConfig } = createNetworkConfig({
  testnet: { url: TESTNET_URL, network: "testnet" },
});

function googleEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_ENOKI_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

function EnokiRegister() {
  const client = useSuiClient();
  useEffect(() => {
    if (!googleEnabled()) return;
    const apiKey = process.env.NEXT_PUBLIC_ENOKI_API_KEY;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!apiKey || !clientId) return;
    const { unregister } = registerEnokiWallets({
      apiKey,
      providers: {
        google: {
          clientId,
          redirectUrl: `${window.location.origin}/auth/callback`,
        },
      },
      network: "testnet",
      client,
    });
    return unregister;
  }, [client]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect={false} preferredWallets={["Slush"]} slushWallet={{ name: "Kolo" }}>
          <EnokiRegister />
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
