/**
 * Selendra Naming Service SDK Constants
 */

// Chain configurations
export const selendraMainnet = {
  id: 1961,
  name: "Selendra Mainnet",
  nativeCurrency: {
    name: "SEL",
    symbol: "SEL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.selendra.org"],
    },
    public: {
      http: ["https://rpc.selendra.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Selendra Explorer",
      url: "https://explorer.selendra.org",
    },
  },
} as const;

export const selendraTestnet = {
  id: 1953,
  name: "Selendra Testnet",
  nativeCurrency: {
    name: "tSEL",
    symbol: "tSEL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.selendra.org"],
    },
    public: {
      http: ["https://rpc-testnet.selendra.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Selendra Testnet Explorer",
      url: "https://explorer-testnet.selendra.org",
    },
  },
  testnet: true,
} as const;

// Contract addresses (testnet)
export const testnetAddresses = {
  SNSRegistry: "0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a" as `0x${string}`,
  PublicResolver: "0x39f8bB3627d84092572304Ed01f1532855775207" as `0x${string}`,  // MultiChainResolver
  BaseRegistrar: "0xbF0AF7D1b5a6F17A9C6448375B0f1c4788a27Ff6" as `0x${string}`,
  PriceOracle: "0x81eBB2a59e61D268c47f4F707e7D4f2aAfd9b890" as `0x${string}`,
  SELRegistrarController:
    "0xC202368044C4e633B5585D3e9498E421b5955D8E" as `0x${string}`,
  ReverseRegistrar:
    "0xB708898adFeAC80aA1F9cD1Da2B3113d7f5B825E" as `0x${string}`,
} as const;

// Contract addresses (mainnet) - to be filled after deployment
export const mainnetAddresses = {
  SNSRegistry: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  PublicResolver: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  BaseRegistrar: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  PriceOracle: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  SELRegistrarController:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  ReverseRegistrar:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

// Root node (bytes32(0))
export const ROOT_NODE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

// Coin types (SLIP-44) - https://github.com/satoshilabs/slips/blob/master/slip-0044.md
export const COIN_TYPES = {
  // Major cryptocurrencies
  BTC: 0n,         // Bitcoin
  LTC: 2n,         // Litecoin
  DOGE: 3n,        // Dogecoin
  DASH: 5n,        // Dash
  ETH: 60n,        // Ethereum/EVM chains
  ETC: 61n,        // Ethereum Classic
  XRP: 144n,       // Ripple
  BCH: 145n,       // Bitcoin Cash
  XLM: 148n,       // Stellar
  XMR: 128n,       // Monero
  ZEC: 133n,       // Zcash

  // Smart contract platforms
  EOS: 194n,       // EOS
  TRX: 195n,       // Tron
  ATOM: 118n,      // Cosmos
  DOT: 354n,       // Polkadot
  KSM: 434n,       // Kusama
  SOL: 501n,       // Solana
  ALGO: 283n,      // Algorand
  NEAR: 397n,      // NEAR Protocol
  FIL: 461n,       // Filecoin
  AR: 472n,        // Arweave
  FLOW: 539n,      // Flow
  EGLD: 508n,      // MultiversX/Elrond
  ADA: 1815n,      // Cardano
  XTZ: 1729n,      // Tezos
  AVAX: 9000n,     // Avalanche
  FTM: 1007n,      // Fantom
  ONE: 1023n,      // Harmony
  HBAR: 3030n,     // Hedera
  ICP: 223n,       // Internet Computer

  // Layer 2 / EVM chains
  MATIC: 966n,     // Polygon
  OP: 614n,        // Optimism
  ARB: 9001n,      // Arbitrum
  BNB: 714n,       // BNB Chain

  // Other notable chains
  TON: 607n,       // TON
  APT: 637n,       // Aptos
  SUI: 784n,       // Sui
  SEI: 19000118n,  // Sei
  INJ: 22000119n,  // Injective
  OSMO: 10000118n, // Osmosis
  LUNA: 330n,      // Terra
  CRO: 394n,       // Cronos
  KLAY: 8217n,     // Klaytn/Kaia
  VET: 818n,       // VeChain
  NEO: 888n,       // NEO
  THETA: 500n,     // Theta
  ROSE: 474n,      // Oasis
  ZIL: 313n,       // Zilliqa
  CELO: 52752n,    // Celo
  ASTR: 810n,      // Astar
  GLMR: 1284n,     // Moonbeam
  MOVR: 1285n,     // Moonriver
  CFX: 503n,       // Conflux
  KDA: 626n,       // Kadena
  MINA: 12586n,    // Mina
  STX: 5757n,      // Stacks
  CKB: 309n,       // Nervos CKB
  KAVA: 459n,      // Kava

  // Selendra (Polkadot ecosystem)
  SEL: 354n,       // Selendra
} as const;

// Coin type name mapping for display
export const COIN_TYPE_NAMES: Record<bigint, string> = {
  0n: 'Bitcoin',
  2n: 'Litecoin',
  3n: 'Dogecoin',
  60n: 'Ethereum',
  501n: 'Solana',
  354n: 'Polkadot/Selendra',
  9000n: 'Avalanche',
  1815n: 'Cardano',
  714n: 'BNB Chain',
  966n: 'Polygon',
  144n: 'XRP',
  195n: 'Tron',
  607n: 'TON',
  637n: 'Aptos',
  784n: 'Sui',
};

// Grace period (90 days in seconds)
export const GRACE_PERIOD = 90n * 24n * 60n * 60n;

// Minimum registration duration (1 year in seconds)
export const MIN_REGISTRATION_DURATION = 365n * 24n * 60n * 60n;

// Commitment timing
export const MIN_COMMITMENT_AGE = 10n; // 10 seconds (Selendra has 1s blocks)
export const MAX_COMMITMENT_AGE = 86400n; // 24 hours
