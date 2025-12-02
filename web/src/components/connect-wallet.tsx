"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from "wagmi";
import { activeChain } from "./providers";

// Map connector IDs to user-friendly names
const getConnectorDisplayName = (connector: { id: string; name: string }) => {
  if (connector.id === "injected" || connector.name.toLowerCase() === "injected") {
    return "Browser Wallet";
  }
  if (connector.name.toLowerCase().includes("metamask")) {
    return "MetaMask";
  }
  return connector.name;
};

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format balance for display
  const formatBalance = () => {
    if (!balance) return "";
    const value = parseFloat(balance.formatted);
    if (isNaN(value)) return "";
    return ` (${value.toFixed(2)} ${balance.symbol})`;
  };

  // Check if on wrong network
  const isWrongNetwork = isConnected && chain?.id !== activeChain.id;

  if (!isConnected) {
    return (
      <div className="relative group">
        <button
          type="button"
          disabled={isPending}
          className="bg-[#0db0a4] hover:bg-[#0a9389] text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
          onClick={() => {
            // Try injected wallet first (MetaMask, etc.)
            const injected = connectors.find((c) => c.id === "injected");
            if (injected) {
              connect({ connector: injected });
            }
          }}
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>

        {/* Dropdown for wallet selection */}
        <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-[#0db0a4]/20 bg-white dark:bg-[#0a1f1e] overflow-hidden">
          <div className="px-4 py-2 border-b border-[#0db0a4]/10">
            <span className="text-xs font-medium text-[#0db0a4] uppercase tracking-wide">Select Wallet</span>
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-[#0db0a4]/10 hover:text-[#0db0a4] transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[#0db0a4]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0db0a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="font-medium">{getConnectorDisplayName(connector)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain?.({ chainId: activeChain.id })}
        type="button"
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
      >
        Switch to Selendra
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <div className="flex items-center gap-2 bg-[#0db0a4]/10 text-[#0db0a4] py-2 px-3 rounded-lg border border-[#0db0a4]/20">
        <div className="w-2 h-2 bg-[#0db0a4] rounded-full animate-pulse" />
        <span className="hidden sm:inline text-sm font-medium">{chain?.name}</span>
      </div>

      <button
        onClick={() => disconnect()}
        type="button"
        className="flex items-center gap-2 bg-[#0db0a4]/10 hover:bg-[#0db0a4]/20 text-[#0db0a4] py-2 px-3 rounded-lg transition-colors duration-200 border border-[#0db0a4]/20"
      >
        <span className="truncate max-w-[100px] sm:max-w-none font-medium">
          {formatAddress(address!)}
          <span className="hidden sm:inline text-[#0a9389]">{formatBalance()}</span>
        </span>
      </button>
    </div>
  );
}

// Simple version - same as main now
export function ConnectWalletSimple() {
  return <ConnectWallet />;
}
