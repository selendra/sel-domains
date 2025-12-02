# SNS Design Document

> Selendra Naming Service - Human-readable names for Selendra addresses

## Overview

SNS (Selendra Naming Service) is a decentralized naming system that maps human-readable names like `alice.sel` to machine-readable identifiers such as addresses, content hashes, and metadata.

## Goals

1. **Simple** - Easy to register, use, and integrate
2. **Secure** - Prevent front-running, squatting, and theft
3. **Decentralized** - No single point of failure
4. **Extensible** - Support multiple record types and chains

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User / dApp                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SDK (Viem)                              │
│    TypeScript/JavaScript interface for all SNS operations       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Smart Contracts                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │  SNSRegistry  │───▶│PublicResolver │───▶│   Records     │   │
│  │    (Core)     │    │   (Lookup)    │    │   (Data)      │   │
│  └───────────────┘    └───────────────┘    └───────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │BaseRegistrar  │    │  PriceOracle  │    │   Reverse     │   │
│  │   (ERC-721)   │    │   (Pricing)   │    │  Registrar    │   │
│  └───────────────┘    └───────────────┘    └───────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  ┌───────────────┐                                              │
│  │  Controller   │                                              │
│  │(Registration) │                                              │
│  └───────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. SNS Registry

The central contract storing domain ownership and resolver mappings.

**Responsibilities:**

- Store owner for each node (namehash)
- Store resolver address for each node
- Emit events for ownership/resolver changes
- Support operator approvals

**Key Data:**

```
node (bytes32) → Record {
    owner: address
    resolver: address
    ttl: uint64
}
```

### 2. Base Registrar (ERC-721)

NFT representation of `.sel` domain ownership.

**Responsibilities:**

- Mint NFT when domain registered
- Track expiration times
- Handle domain transfers
- Manage authorized controllers

**Key Features:**

- `tokenId = labelhash(name)` (e.g., keccak256("alice"))
- Grace period: 90 days after expiry
- Tradeable on NFT marketplaces

### 3. SEL Registrar Controller

User-facing registration interface with anti-frontrun protection.

**Responsibilities:**

- Implement commit-reveal scheme
- Calculate and collect fees
- Validate name requirements
- Interact with BaseRegistrar

**Commit-Reveal Flow:**

```
1. User calls makeCommitment(name, owner, duration, secret, ...)
2. User calls commit(commitment) - stores hash on-chain
3. Wait 60 seconds (MIN_COMMITMENT_AGE)
4. User calls register(...) with same parameters + payment
5. Controller validates, charges, and mints NFT
```

### 4. Public Resolver

Stores and retrieves records for domains.

**Supported Records:**
| Type | Function | Example |
|------|----------|---------|
| Address (EVM) | `addr(node)` | 0x742d35... |
| Address (Multi-chain) | `addr(node, coinType)` | Various formats |
| Text | `text(node, key)` | email, avatar, url |
| Content Hash | `contenthash(node)` | ipfs://Qm... |
| Name | `name(node)` | alice.sel (reverse) |

### 5. Price Oracle

Calculates registration costs based on name length.

**Pricing Tiers:**
| Length | Price/Year | Rationale |
|--------|------------|-----------|
| 3 chars | 1,000 SEL | Premium short names |
| 4 chars | 250 SEL | Valuable short names |
| 5+ chars | 50 SEL | Standard names |

**Discounts:**

- 10% off for 2+ year registrations

### 6. Reverse Registrar

Maps addresses back to names for display.

**Use Cases:**

- Show "alice.sel" instead of "0x742d35..."
- Primary name for wallet display
- Identity verification

---

## Data Model

### Namehash

Hierarchical hashing algorithm (EIP-137):

```
namehash("") = 0x0000...0000 (32 zero bytes)
namehash("sel") = keccak256(namehash("") + keccak256("sel"))
namehash("alice.sel") = keccak256(namehash("sel") + keccak256("alice"))
```

### Labelhash

Simple hash of a single label:

```
labelhash("alice") = keccak256("alice")
```

### Node Ownership

```
Root (0x00...00) → Deployer
    └── sel → BaseRegistrar
            └── alice.sel → User
            └── bob.sel → User
```

---

## Security Considerations

### Anti-Frontrunning

The commit-reveal scheme prevents miners/validators from:

1. Seeing desired name in mempool
2. Front-running with their own registration

**Timing:**

- Minimum commitment age: 60 seconds
- Maximum commitment age: 24 hours

### Access Control

| Action            | Authorized                  |
| ----------------- | --------------------------- |
| Register new name | Anyone (via Controller)     |
| Modify records    | Owner or approved operator  |
| Transfer domain   | Owner or approved operator  |
| Add controller    | Registry owner (governance) |

### Grace Period

90-day grace period after expiry:

- Owner can still renew
- Domain not available to others
- Prevents accidental loss

---

## User Flows

### Registration Flow

```
┌─────────┐     ┌────────────┐     ┌───────────┐     ┌──────────┐
│  User   │────▶│ Controller │────▶│ Registrar │────▶│ Registry │
└─────────┘     └────────────┘     └───────────┘     └──────────┘
     │                │                   │                │
     │ 1. commit()    │                   │                │
     │───────────────▶│                   │                │
     │                │                   │                │
     │   [wait 60s]   │                   │                │
     │                │                   │                │
     │ 2. register()  │                   │                │
     │───────────────▶│                   │                │
     │                │ 3. register()     │                │
     │                │──────────────────▶│                │
     │                │                   │ 4. setOwner()  │
     │                │                   │───────────────▶│
     │                │                   │                │
     │ 5. NFT minted  │                   │                │
     │◀───────────────│                   │                │
```

### Resolution Flow

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User   │────▶│   SDK    │────▶│ Registry │────▶│ Resolver │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ resolve("alice.sel")           │                │
     │───────────────▶│                │                │
     │                │ resolver(node) │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │◀───────────────│                │
     │                │    0x...       │                │
     │                │                │                │
     │                │       addr(node)               │
     │                │───────────────────────────────▶│
     │                │                                │
     │                │◀───────────────────────────────│
     │  0x742d35...   │                                │
     │◀───────────────│                                │
```

---

## Integration Points

### MetaMask Snaps Integration

MetaMask doesn't natively support ENS on custom networks. We solve this with a **MetaMask Snap** that provides custom name resolution.

**How it works:**

```
User types "alice.sel" → MetaMask → SNS Snap → Selendra RPC → Address
```

1. User types `.sel` domain in MetaMask send field
2. MetaMask routes to SNS Snap via `onNameLookup` handler
3. Snap computes namehash (EIP-137) and queries SNS Registry
4. Resolver returns mapped address
5. MetaMask displays resolved address

**Snap Permissions:**
- `endowment:name-lookup` - Custom name resolution for `.sel` TLD
- `endowment:network-access` - RPC calls to Selendra

**Supported Chains:**
- `eip155:1961` - Selendra Mainnet
- `eip155:1953` - Selendra Testnet

### Wallet Integration

```typescript
// Display .sel name instead of address
const name = await sns.lookupAddress(userAddress);
display(name || shortenAddress(userAddress));
```

### dApp Integration

```typescript
// Resolve payment address
const payTo = await sns.resolveName("merchant.sel");
await sendPayment(payTo, amount);
```

### Explorer Integration

```typescript
// Show name in transaction history
const name = await sns.lookupAddress(txFrom);
displayTx({ from: name || txFrom, ... });
```

---

## Future Considerations

### Subdomains

```
company.sel
├── alice.company.sel
├── bob.company.sel
└── support.company.sel
```

### Multi-chain Support

Store addresses for multiple chains:

- SEL (coin type 1961)
- ETH (coin type 60)
- BTC (coin type 0)

### Governance

Community control over:

- Pricing changes
- Reserved name policies
- Protocol upgrades

---

## References

- [EIP-137: Ethereum Domain Name Service](https://eips.ethereum.org/EIPS/eip-137)
- [ENS Documentation](https://docs.ens.domains)
- [SLIP-44: Coin Types](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
