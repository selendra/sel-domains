"use client";

import { ReactNode } from "react";
import { WagmiProvider, http, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { defineChain } from "viem";
import "@rainbow-me/rainbowkit/styles.css";

// Define Selendra Testnet (Chain ID 1953)
// For development, we use testnet by default
const selendraTestnet = defineChain({
  id: 1953,
  name: "Selendra Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Selendra",
    symbol: "SEL",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.selendra.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Selendra Portal",
      url: "https://portal.selendra.org/?rpc=wss%3A%2F%2Frpc-testnet.selendra.org#/explorer",
    },
  },
  testnet: true,
});

// Only use the wallets we actually need
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, metaMaskWallet, walletConnectWallet],
    },
  ],
  {
    appName: "SNS - Selendra Naming Service",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo",
  }
);

// Configure wagmi - using only testnet for now
const config = createConfig({
  connectors,
  chains: [selendraTestnet],
  transports: {
    [selendraTestnet.id]: http("https://rpc-testnet.selendra.org"),
  },
  ssr: true,
});

// Create query client
const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#0db0a4",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
