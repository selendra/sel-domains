// Testnet contract addresses (deployed 2025-01-17)
export const CONTRACT_ADDRESSES = {
  // Core registry
  SNSRegistry: "0x64Ff7c36e879516724dFE312c5D6C704d6bD6be1" as `0x${string}`,

  // Registration controller
  SELRegistrarController:
    "0xD45c5b8df20Bb0be78e85aeaE56606D385770691" as `0x${string}`,

  // Resolver
  PublicResolver: "0x4d379C8bbee421f6742b078956F2714D701Aa997" as `0x${string}`,

  // Price oracle
  PriceOracle: "0xf157c876e1206A2AA22A36EF034986e8B621a851" as `0x${string}`,

  // Reverse registrar
  ReverseRegistrar:
    "0x009439C9b8BFa22f5cbdEb479bAA8e5Fa2041899" as `0x${string}`,

  // Base registrar (NFT contract)
  BaseRegistrar: "0x875C6bDc6C315FCFF1429B80D39C0259E5cFcaa3" as `0x${string}`,
} as const;

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

// ============ Public Resolver ABI ============
export const PublicResolverABI = [
  // Address resolution
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
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
