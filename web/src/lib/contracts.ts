/**
 * Contract addresses loaded from environment variables
 * Set these in .env.local or via Vercel deployment
 * 
 * Required env vars:
 * - NEXT_PUBLIC_NETWORK (testnet | mainnet)
 * - NEXT_PUBLIC_SNS_REGISTRY
 * - NEXT_PUBLIC_SEL_REGISTRAR_CONTROLLER
 * - NEXT_PUBLIC_PUBLIC_RESOLVER
 * - NEXT_PUBLIC_PRICE_ORACLE
 * - NEXT_PUBLIC_REVERSE_REGISTRAR
 * - NEXT_PUBLIC_BASE_REGISTRAR
 */

const getAddress = (envVar: string, fallback: string): `0x${string}` => {
  const value = process.env[envVar] || fallback;
  if (!value.startsWith("0x")) {
    throw new Error(`Invalid address for ${envVar}: ${value}`);
  }
  return value as `0x${string}`;
};

// Default addresses (testnet - chain 1953)
const TESTNET_DEFAULTS = {
  SNSRegistry: "0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a",
  SELRegistrarController: "0xC202368044C4e633B5585D3e9498E421b5955D8E",
  PublicResolver: "0x39f8bB3627d84092572304Ed01f1532855775207",  // MultiChainResolver
  PriceOracle: "0x81eBB2a59e61D268c47f4F707e7D4f2aAfd9b890",
  ReverseRegistrar: "0xB708898adFeAC80aA1F9cD1Da2B3113d7f5B825E",
  BaseRegistrar: "0xbF0AF7D1b5a6F17A9C6448375B0f1c4788a27Ff6",
};

// Default addresses (mainnet - chain 1961) - to be updated after deployment
const MAINNET_DEFAULTS = {
  SNSRegistry: "0x0000000000000000000000000000000000000000",
  SELRegistrarController: "0x0000000000000000000000000000000000000000",
  PublicResolver: "0x0000000000000000000000000000000000000000",
  PriceOracle: "0x0000000000000000000000000000000000000000",
  ReverseRegistrar: "0x0000000000000000000000000000000000000000",
  BaseRegistrar: "0x0000000000000000000000000000000000000000",
};

// Select defaults based on network
const isMainnet = process.env.NEXT_PUBLIC_NETWORK === "mainnet";
const DEFAULTS = isMainnet ? MAINNET_DEFAULTS : TESTNET_DEFAULTS;

export const CONTRACT_ADDRESSES = {
  SNSRegistry: getAddress("NEXT_PUBLIC_SNS_REGISTRY", DEFAULTS.SNSRegistry),
  SELRegistrarController: getAddress("NEXT_PUBLIC_SEL_REGISTRAR_CONTROLLER", DEFAULTS.SELRegistrarController),
  PublicResolver: getAddress("NEXT_PUBLIC_PUBLIC_RESOLVER", DEFAULTS.PublicResolver),
  PriceOracle: getAddress("NEXT_PUBLIC_PRICE_ORACLE", DEFAULTS.PriceOracle),
  ReverseRegistrar: getAddress("NEXT_PUBLIC_REVERSE_REGISTRAR", DEFAULTS.ReverseRegistrar),
  BaseRegistrar: getAddress("NEXT_PUBLIC_BASE_REGISTRAR", DEFAULTS.BaseRegistrar),
} as const;

// Export network info for debugging
export const NETWORK_INFO = {
  isMainnet,
  chainId: isMainnet ? 1961 : 1953,
  name: isMainnet ? "Selendra Mainnet" : "Selendra Testnet",
} as const;

// Block number when contracts were deployed (for efficient log queries)
// This avoids scanning from genesis block
export const DEPLOYMENT_BLOCK = isMainnet ? 0n : 37000n; // Testnet deployment block ~37223

// ============ SNS Registry ABI ============
export const SNSRegistryABI = [
  // View functions
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "ttl",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "recordExists",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // Write functions
  {
    name: "setOwner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "owner", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "setResolver",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "resolver", type: "address" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "NewOwner",
    type: "event",
    inputs: [
      { name: "node", type: "bytes32", indexed: true },
      { name: "label", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: false },
    ],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "node", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: false },
    ],
  },
] as const;

// ============ SEL Registrar Controller ABI ============
export const SELRegistrarControllerABI = [
  // View functions
  {
    name: "available",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "valid",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "rentPrice",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [
      { name: "base", type: "uint256" },
      { name: "premium", type: "uint256" },
    ],
  },
  {
    name: "commitments",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "makeCommitment",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "duration", type: "uint256" },
      { name: "secret", type: "bytes32" },
      { name: "resolver", type: "address" },
      { name: "data", type: "bytes[]" },
      { name: "reverseRecord", type: "bool" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // Write functions
  {
    name: "commit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "owner", type: "address" },
      { name: "duration", type: "uint256" },
      { name: "secret", type: "bytes32" },
      { name: "resolver", type: "address" },
      { name: "data", type: "bytes[]" },
      { name: "reverseRecord", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "renew",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "NameRegistered",
    type: "event",
    inputs: [
      { name: "name", type: "string", indexed: false },
      { name: "label", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "cost", type: "uint256", indexed: false },
      { name: "expires", type: "uint256", indexed: false },
    ],
  },
  {
    name: "NameRenewed",
    type: "event",
    inputs: [
      { name: "name", type: "string", indexed: false },
      { name: "label", type: "bytes32", indexed: true },
      { name: "cost", type: "uint256", indexed: false },
      { name: "expires", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Commit",
    type: "event",
    inputs: [{ name: "commitment", type: "bytes32", indexed: true }],
  },
] as const;

// ============ SLIP-44 Coin Types for Multichain Support ============
export const COIN_TYPES = {
  // Major chains
  BTC: 0,        // Bitcoin
  LTC: 2,        // Litecoin
  DOGE: 3,       // Dogecoin
  ETH: 60,       // Ethereum/EVM (used for Selendra)
  ETC: 61,       // Ethereum Classic
  ATOM: 118,     // Cosmos
  XMR: 128,      // Monero
  ZEC: 133,      // Zcash
  XRP: 144,      // Ripple
  BCH: 145,      // Bitcoin Cash
  XLM: 148,      // Stellar
  EOS: 194,      // EOS
  TRX: 195,      // Tron
  ICP: 223,      // Internet Computer
  ALGO: 283,     // Algorand
  ZIL: 313,      // Zilliqa
  DOT: 354,      // Polkadot
  NEAR: 397,     // NEAR Protocol
  KSM: 434,      // Kusama
  FIL: 461,      // Filecoin
  AR: 472,       // Arweave
  ROSE: 474,     // Oasis
  THETA: 500,    // Theta
  SOL: 501,      // Solana
  CFX: 503,      // Conflux
  EGLD: 508,     // MultiversX
  FLOW: 539,     // Flow
  TON: 607,      // TON
  APT: 637,      // Aptos
  BNB: 714,      // Binance Chain
  SUI: 784,      // Sui
  VET: 818,      // VeChain
  NEO: 888,      // NEO
  MATIC: 966,    // Polygon
  FTM: 1007,     // Fantom
  ONE: 1023,     // Harmony
  GLMR: 1284,    // Moonbeam
  MOVR: 1285,    // Moonriver
  XTZ: 1729,     // Tezos
  ADA: 1815,     // Cardano
  HBAR: 3030,    // Hedera
  HNS: 5353,     // Handshake
  STX: 5757,     // Stacks
  KLAY: 8217,    // Klaytn/Kaia
  AVAX: 9000,    // Avalanche
  ARB: 9001,     // Arbitrum
  CELO: 52752,   // Celo
  OSMO: 10000118, // Osmosis
  SEI: 19000118,  // Sei
  INJ: 22000119,  // Injective
} as const;

// Coin type metadata for UI
export const COIN_TYPE_INFO: Record<number, { symbol: string; name: string; icon: string }> = {
  [COIN_TYPES.BTC]: { symbol: "BTC", name: "Bitcoin", icon: "₿" },
  [COIN_TYPES.ETH]: { symbol: "ETH", name: "Ethereum", icon: "Ξ" },
  [COIN_TYPES.SOL]: { symbol: "SOL", name: "Solana", icon: "◎" },
  [COIN_TYPES.BNB]: { symbol: "BNB", name: "BNB Chain", icon: "🔶" },
  [COIN_TYPES.MATIC]: { symbol: "MATIC", name: "Polygon", icon: "⬡" },
  [COIN_TYPES.AVAX]: { symbol: "AVAX", name: "Avalanche", icon: "🔺" },
  [COIN_TYPES.ARB]: { symbol: "ARB", name: "Arbitrum", icon: "🔵" },
  [COIN_TYPES.DOT]: { symbol: "DOT", name: "Polkadot", icon: "●" },
  [COIN_TYPES.ADA]: { symbol: "ADA", name: "Cardano", icon: "₳" },
  [COIN_TYPES.XRP]: { symbol: "XRP", name: "Ripple", icon: "✕" },
  [COIN_TYPES.DOGE]: { symbol: "DOGE", name: "Dogecoin", icon: "Ð" },
  [COIN_TYPES.LTC]: { symbol: "LTC", name: "Litecoin", icon: "Ł" },
  [COIN_TYPES.ATOM]: { symbol: "ATOM", name: "Cosmos", icon: "⚛" },
  [COIN_TYPES.NEAR]: { symbol: "NEAR", name: "NEAR Protocol", icon: "Ⓝ" },
  [COIN_TYPES.TRX]: { symbol: "TRX", name: "Tron", icon: "⟁" },
  [COIN_TYPES.XLM]: { symbol: "XLM", name: "Stellar", icon: "✦" },
  [COIN_TYPES.FIL]: { symbol: "FIL", name: "Filecoin", icon: "⬡" },
  [COIN_TYPES.APT]: { symbol: "APT", name: "Aptos", icon: "🔷" },
  [COIN_TYPES.SUI]: { symbol: "SUI", name: "Sui", icon: "💧" },
  [COIN_TYPES.TON]: { symbol: "TON", name: "TON", icon: "💎" },
  [COIN_TYPES.FTM]: { symbol: "FTM", name: "Fantom", icon: "👻" },
  [COIN_TYPES.GLMR]: { symbol: "GLMR", name: "Moonbeam", icon: "🌙" },
  [COIN_TYPES.MOVR]: { symbol: "MOVR", name: "Moonriver", icon: "🌊" },
  [COIN_TYPES.CELO]: { symbol: "CELO", name: "Celo", icon: "🟡" },
  [COIN_TYPES.ALGO]: { symbol: "ALGO", name: "Algorand", icon: "Ⓐ" },
  [COIN_TYPES.HBAR]: { symbol: "HBAR", name: "Hedera", icon: "ℏ" },
  [COIN_TYPES.ETC]: { symbol: "ETC", name: "Ethereum Classic", icon: "⟠" },
  [COIN_TYPES.BCH]: { symbol: "BCH", name: "Bitcoin Cash", icon: "₿" },
  [COIN_TYPES.XTZ]: { symbol: "XTZ", name: "Tezos", icon: "ꜩ" },
  [COIN_TYPES.FLOW]: { symbol: "FLOW", name: "Flow", icon: "🌊" },
  [COIN_TYPES.KSM]: { symbol: "KSM", name: "Kusama", icon: "🦅" },
};

// Popular coins for quick selection in UI
export const POPULAR_COIN_TYPES = [
  COIN_TYPES.ETH,
  COIN_TYPES.BTC,
  COIN_TYPES.SOL,
  COIN_TYPES.BNB,
  COIN_TYPES.MATIC,
  COIN_TYPES.AVAX,
  COIN_TYPES.ARB,
  COIN_TYPES.DOT,
  COIN_TYPES.ADA,
  COIN_TYPES.XRP,
  COIN_TYPES.DOGE,
  COIN_TYPES.LTC,
  COIN_TYPES.ATOM,
  COIN_TYPES.NEAR,
  COIN_TYPES.TRX,
  COIN_TYPES.TON,
  COIN_TYPES.APT,
  COIN_TYPES.SUI,
];

// ============ Public Resolver ABI (MultiChain) ============
export const PublicResolverABI = [
  // Address resolution - EIP-137 (ETH address)
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  // Address resolution - EIP-2304 (multichain)
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "coinType", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  // Set ETH address - EIP-137
  {
    name: "setAddr",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [],
  },
  // Set multichain address - EIP-2304
  {
    name: "setAddr",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "coinType", type: "uint256" },
      { name: "a", type: "bytes" },
    ],
    outputs: [],
  },
  // Batch read addresses
  {
    name: "getAddresses",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "coinTypes", type: "uint256[]" },
    ],
    outputs: [{ name: "addresses", type: "bytes[]" }],
  },
  // Text records
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
  // Content hash
  {
    name: "contenthash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    name: "setContenthash",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" },
    ],
    outputs: [],
  },
  // Name (for reverse resolution)
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "setName",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "name", type: "string" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "AddrChanged",
    type: "event",
    inputs: [
      { name: "node", type: "bytes32", indexed: true },
      { name: "addr", type: "address", indexed: false },
    ],
  },
  {
    name: "TextChanged",
    type: "event",
    inputs: [
      { name: "node", type: "bytes32", indexed: true },
      { name: "indexedKey", type: "string", indexed: true },
      { name: "key", type: "string", indexed: false },
      { name: "value", type: "string", indexed: false },
    ],
  },
] as const;

// ============ Price Oracle ABI ============
export const PriceOracleABI = [
  {
    name: "price",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [
      { name: "base", type: "uint256" },
      { name: "premium", type: "uint256" },
    ],
  },
  {
    name: "renewalPrice",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ============ Reverse Registrar ABI ============
export const ReverseRegistrarABI = [
  {
    name: "setName",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "setNameForAddr",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "addr", type: "address" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "name", type: "string" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "node",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // Events
  {
    name: "ReverseClaimed",
    type: "event",
    inputs: [
      { name: "addr", type: "address", indexed: true },
      { name: "node", type: "bytes32", indexed: true },
    ],
  },
] as const;

// ============ Base Registrar ABI (NFT) ============
export const BaseRegistrarABI = [
  // ERC721 standard
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Domain specific
  {
    name: "nameExpires",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    name: "NameRegistered",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "expires", type: "uint256", indexed: false },
    ],
  },
  {
    name: "NameRenewed",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "expires", type: "uint256", indexed: false },
    ],
  },
] as const;
