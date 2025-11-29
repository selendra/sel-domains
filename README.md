# Selendra Naming Service (SNS)

> Human-readable names for Selendra addresses — `.sel` domains

## Overview

SNS is a decentralized naming system built on Selendra, inspired by ENS (Ethereum Name Service). It maps human-readable names like `alice.sel` to machine-readable identifiers such as Selendra addresses, content hashes, and metadata.

## Why .sel Domains?

| Traditional                                        | With SNS      |
| -------------------------------------------------- | ------------- |
| `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` | `alice.sel`   |
| `0x742d35Cc6634C0532925a3b844Bc9e7595f...`         | `bitriel.sel` |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         SNS Protocol                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Registry   │───▶│   Resolver   │───▶│    Records   │   │
│  │   (Core)     │    │   (Lookup)   │    │   (Data)     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Registrar   │    │    Price     │    │   Reverse    │   │
│  │  Controller  │───▶│   Oracle     │    │   Registrar  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
sel-domains/
├── src/                          # Solidity contracts (Foundry)
│   ├── SNSRegistry.sol           # Core registry (owner/resolver mapping)
│   ├── PublicResolver.sol        # Multi-record resolver
│   ├── BaseRegistrar.sol         # ERC-721 NFT for domain ownership
│   ├── SELRegistrarController.sol # Commit-reveal registration
│   ├── ReverseRegistrar.sol      # Address → name reverse resolution
│   ├── PriceOracle.sol           # Dynamic pricing by name length
│   ├── interfaces/
│   │   └── ISNSContracts.sol     # Standard interfaces
│   └── utils/
│       └── SNSUtils.sol          # Helper library
├── test/                         # Solidity tests
│   ├── SNSRegistry.t.sol
│   ├── BaseRegistrar.t.sol
│   ├── SELRegistrarController.t.sol
│   └── PublicResolver.t.sol
├── script/                       # Deployment scripts (Forge)
│   └── DeploySNS.s.sol
├── sdk/                          # Viem-based TypeScript SDK
│   ├── src/
│   │   ├── index.ts
│   │   ├── sns.ts
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   └── abis/
│   ├── package.json
│   └── tsconfig.json
├── web/                          # Next.js frontend
├── docs/                         # Documentation
│   ├── design.md
│   ├── tech.md
│   └── tasks.md
├── foundry.toml                  # Foundry configuration
├── remappings.txt                # Import remappings
└── README.md
```

## Core Components

### 1. SNS Registry

The central contract that stores all domain ownership and resolver information.

- Maps namehash → owner
- Maps namehash → resolver
- Stores TTL for caching

### 2. Base Registrar (ERC-721)

Represents .sel domain ownership as tradeable NFTs.

- Each domain is a unique token
- Token ID = labelhash of the name
- Transferable on NFT marketplaces
- Expiration tracking

### 3. Registrar Controller

Handles domain registration with commit-reveal scheme to prevent front-running.

- Commit phase: Hash your intent
- Reveal phase: Complete registration after 60 seconds
- Pricing based on name length

### 4. Public Resolver

Stores various records for domains:

- **EVM Address** — 0x... addresses (coin type 1961)
- **Substrate Address** — SS58 addresses (stored as bytes)
- **Text records** — Avatar, description, social links
- **Content hash** — IPFS/Arweave content
- **ABI** — Contract interface definitions

### 5. Reverse Registrar

Maps addresses back to names for display purposes.

- Enables "alice.sel" display instead of raw addresses
- Users can set their primary name

## Pricing Model

| Name Length   | Annual Price (SEL) | Example     |
| ------------- | ------------------ | ----------- |
| 3 characters  | 500 SEL            | `abc.sel`   |
| 4 characters  | 100 SEL            | `john.sel`  |
| 5+ characters | 5 SEL              | `alice.sel` |

**Discounts:**

- 10% off for 2+ year registrations
- Premium names may have additional pricing

## Registration Flow

```
User                    Controller              Registry
  │                          │                      │
  │  1. makeCommitment()     │                      │
  │─────────────────────────▶│                      │
  │                          │                      │
  │  2. commit(hash)         │                      │
  │─────────────────────────▶│                      │
  │                          │                      │
  │     [Wait 60 seconds]    │                      │
  │                          │                      │
  │  3. register() + payment │                      │
  │─────────────────────────▶│                      │
  │                          │  4. setSubnode()     │
  │                          │─────────────────────▶│
  │                          │                      │
  │  5. NFT minted ✓         │                      │
  │◀─────────────────────────│                      │
```

## Supported Records

| Record Type      | Key Examples             | Description           |
| ---------------- | ------------------------ | --------------------- |
| `addr`           | `addr(node)`             | Primary EVM address   |
| `addr(coinType)` | `addr(node, 1961)`       | Multi-chain addresses |
| `text`           | `email`, `url`, `avatar` | Arbitrary text data   |
| `contenthash`    | IPFS, Arweave            | Decentralized content |
| `ABI`            | Contract ABI             | Interface definitions |

## Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

### Build Contracts

```bash
forge build
```

### Run Tests

```bash
forge test
forge test -vvv  # verbose output
```

### Deploy to Testnet

```bash
# Set up your environment
export PRIVATE_KEY=0x...
export RPC_URL=https://rpc-testnet.selendra.org

# Deploy (use --legacy for Selendra network)
forge script script/DeploySNS.s.sol:DeploySNS \
  --rpc-url $RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY \
  --legacy
```

## SDK Usage

```typescript
import { SNS, selendraTestnet } from "@selendra/sns-sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Create clients
const publicClient = createPublicClient({
  chain: selendraTestnet,
  transport: http(),
});

const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({
  account,
  chain: selendraTestnet,
  transport: http(),
});

// Initialize SNS
const sns = new SNS({
  publicClient,
  walletClient,
  network: "testnet",
});

// Check availability
const available = await sns.isAvailable("alice");
console.log("alice.sel available:", available);

// Get price (1 year)
const price = await sns.getPrice("alice", 365n * 24n * 60n * 60n);
console.log("Price:", price.total, "wei");

// Resolve domain
const address = await sns.getAddress("alice.sel");
console.log("alice.sel →", address);

// Get domain info
const info = await sns.getDomainInfo("alice");
console.log("Domain info:", info);

// Register (with auto commit-reveal)
const { commitTx, registerTx } = await sns.registerWithCommit(
  "myname",
  account.address
);
console.log("Commit tx:", commitTx);
console.log("Register tx:", registerTx);
```

### Build SDK

```bash
cd sdk
npm install
npm run build
```

## Contract Interfaces

### EIP-137: ENS Registry

```solidity
interface ISNSRegistry {
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function setOwner(bytes32 node, address owner) external;
    function setResolver(bytes32 node, address resolver) external;
}
```

### EIP-165: Interface Detection

All resolvers implement EIP-165 for interface detection:

```solidity
resolver.supportsInterface(0x3b3b57de); // addr(bytes32)
resolver.supportsInterface(0x59d1d43c); // text(bytes32,string)
resolver.supportsInterface(0xbc1c58d1); // contenthash(bytes32)
```

## Namehash Algorithm

SNS uses the same namehash algorithm as ENS:

```
namehash('alice.sel') = keccak256(namehash('sel'), keccak256('alice'))
namehash('sel') = keccak256(namehash(''), keccak256('sel'))
namehash('') = 0x0000000000000000000000000000000000000000000000000000000000000000
```

## Network Configuration

| Network | Chain ID | RPC                              |
| ------- | -------- | -------------------------------- |
| Mainnet | 1961     | https://rpc.selendra.org         |
| Testnet | 1953     | https://rpc-testnet.selendra.org |

## Security Considerations

1. **Commit-Reveal**: Prevents front-running of name registrations
2. **Grace Period**: 90 days after expiry to renew without losing name
3. **Access Control**: Only owner/approved operators can modify records
4. **Upgradability**: Consider using proxy patterns for future upgrades

## License

MIT License - see [LICENSE](LICENSE)

## Links

- **Selendra**: https://selendra.org
- **Documentation**: https://docs.selendra.org
- **Explorer**: https://explorer.selendra.org
