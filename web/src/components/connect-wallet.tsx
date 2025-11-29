"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-[#03A9F4] hover:bg-[#0288D1] text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-1 sm:gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-2 sm:px-3 rounded-lg transition-colors duration-200"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {chain.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 20, height: 20 }}
                          />
                        )}
                      </div>
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-1 sm:gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-2 sm:px-3 rounded-lg transition-colors duration-200 truncate max-w-[120px] sm:max-w-none"
                  >
                    <span className="truncate">
                      {account.displayName}
                      <span className="hidden sm:inline">
                        {account.displayBalance && !account.displayBalance.includes('NaN')
                          ? ` (${account.displayBalance})`
                          : ""}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// Simple version using default RainbowKit button
export function ConnectWalletSimple() {
  return <ConnectButton />;
}
