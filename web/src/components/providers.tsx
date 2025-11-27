"use client";

import { ReactNode } from "react";
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import "@rainbow-me/rainbowkit/styles.css";

// Define Selendra Mainnet
const selendraMainnet = defineChain({
  id: 1961,
  name: "Selendra",
  nativeCurrency: {
    decimals: 18,
    name: "Selendra",
    symbol: "SEL",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.selendra.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Selendra Explorer",
      url: "https://scan.selendra.org",
    },
  },
});

// Define Selendra Testnet
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
      name: "Selendra Testnet Explorer",
      url: "https://scan.selendra.org",
    },
  },
  testnet: true,
});

// Configure wagmi with RainbowKit
const config = getDefaultConfig({
  appName: "SNS - Selendra Naming Service",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [selendraMainnet, selendraTestnet],
  transports: {
    [selendraMainnet.id]: http("https://rpc.selendra.org"),
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
            accentColor: "#03A9F4",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
