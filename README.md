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
sns/
├── contracts/
│   ├── SNSRegistry.sol           # Core registry (owner/resolver mapping)
│   ├── PublicResolver.sol        # Multi-record resolver (addr, text, contenthash)
│   ├── BaseRegistrar.sol         # ERC-721 NFT for domain ownership
│   ├── SELRegistrarController.sol # Commit-reveal registration controller
│   ├── ReverseRegistrar.sol      # Address → name reverse resolution
│   ├── PriceOracle.sol           # Dynamic pricing by name length
│   ├── interfaces/
│   │   └── ISNSContracts.sol     # Standard interfaces
│   └── utils/
│       └── SNSUtils.sol          # Helper library (namehash, validation)
├── sdk/
│   └── index.ts                  # JavaScript/TypeScript SDK
├── scripts/
│   └── deploy.ts                 # Deployment script for Selendra
├── test/
│   └── sns.test.ts               # Contract tests
├── hardhat.config.ts             # Hardhat configuration
├── package.json                  # Dependencies
└── README.md                     # This file
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

| Record Type | Key Examples | Description |
|-------------|--------------|-------------|
| `addr` | `addr(node)` | Primary EVM address |
| `addr(coinType)` | `addr(node, 1961)` | Multi-chain addresses |
| `text` | `email`, `url`, `avatar` | Arbitrary text data |
| `contenthash` | IPFS, Arweave | Decentralized content |
| `ABI` | Contract ABI | Interface definitions |

## Quick Start

### Installation

```bash
cd sns
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Deploy to Testnet

```bash
# Set up your .env file first
cp .env.example .env
# Edit .env with your private key

npm run deploy:testnet
```

### Deploy to Mainnet

```bash
npm run deploy:mainnet
```

## SDK Usage

```typescript
import { SNSClient, namehash, DURATION } from './sdk';
import { ethers } from 'ethers';

// Connect to Selendra
const provider = new ethers.JsonRpcProvider('https://rpc.selendra.org');
const sns = new SNSClient(provider, {
  registry: '0x...',
  resolver: '0x...',
  registrarController: '0x...',
  reverseRegistrar: '0x...',
});

// Resolve a name to address
const address = await sns.resolveName('alice.sel');
console.log('alice.sel →', address);

// Reverse resolve an address
const name = await sns.lookupAddress('0x742d35Cc...');
console.log('0x742d35Cc... →', name);

// Check availability
const available = await sns.isAvailable('myname');
console.log('myname.sel available:', available);

// Get price for 1 year
const price = await sns.getPrice('myname', DURATION.ONE_YEAR);
console.log('Price:', ethers.formatEther(price.total), 'SEL');

// Get profile
const profile = await sns.getProfile('alice.sel');
console.log('Profile:', profile);
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

| Network | Chain ID | RPC |
|---------|----------|-----|
| Mainnet | 1961 | https://rpc.selendra.org |
| Testnet | 1953 | https://rpc-testnet.selendra.org |

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
