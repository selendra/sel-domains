# .sel Domains - Roadmap

## Overview

This roadmap covers the core domain registration and renewal features for .sel domains on Selendra.

---

## Phase 1: Foundation (Current)

### Smart Contracts ✅

- [x] SNSRegistry - Core registry contract
- [x] BaseRegistrar - Domain registration logic
- [x] SELRegistrarController - User-facing registration
- [x] PublicResolver - Address/record resolution
- [x] ReverseRegistrar - Reverse lookups (address → name)
- [x] PriceOracle - Dynamic pricing by name length

### Pricing

| Length   | Price/Year | ~USD  |
| -------- | ---------- | ----- |
| 3 chars  | 1,000 SEL  | $10   |
| 4 chars  | 250 SEL    | $2.50 |
| 5+ chars | 50 SEL     | $0.50 |

Multi-year discount: 10% for 2+ years

---

## Phase 2: Web App (In Progress)

### Landing Page ✅

- [x] Hero with domain search
- [x] Pricing display
- [x] Features overview
- [x] FAQ section

### Domain Search

- [ ] Real-time availability check
- [ ] Price calculation with year selector
- [ ] Suggestions for taken names

### Registration Flow

- [ ] Connect wallet (MetaMask, WalletConnect)
- [ ] Select registration period (1-10 years)
- [ ] Review price and confirm
- [ ] Transaction signing
- [ ] Success confirmation with domain details

### Domain Management

- [ ] View owned domains
- [ ] Set primary address
- [ ] Renew domains
- [ ] Transfer ownership

---

## Phase 3: Resolution

### Address Resolution

- [ ] Forward lookup: alice.sel → 0x1234...
- [ ] Reverse lookup: 0x1234... → alice.sel
- [ ] Multi-address support (SEL, ETH, BTC)

### Records

- [ ] Set/update address records
- [ ] Text records (email, url, description)
- [ ] Content hash (IPFS/ARWEAVE)

---

## Phase 4: SDK & Integration

### JavaScript SDK

```typescript
import { SNS } from "@selendra/sns-sdk";

const sns = new SNS({ provider });

// Check availability
const available = await sns.isAvailable("alice");

// Get price
const price = await sns.getPrice("alice", 1); // 1 year

// Register
await sns.register("alice", 1, { value: price });

// Resolve
const address = await sns.resolve("alice.sel");
```

### Integration Points

- [ ] Bitriel Wallet integration
- [ ] Block explorer .sel display
- [ ] DEX address book support

---

## Phase 5: Renewals & Expiry

### Renewal System

- [ ] Renew before expiry
- [ ] Grace period (30 days after expiry)
- [ ] Email/notification reminders
- [ ] Auto-renewal option (if approved)

### Expiry Handling

- [ ] 30-day grace period (owner can still renew)
- [ ] 7-day release period
- [ ] Return to available pool

---

## Technical Stack

| Component | Technology                  |
| --------- | --------------------------- |
| Contracts | Solidity 0.8.20             |
| Frontend  | Next.js 16, React, Tailwind |
| Wallet    | ethers.js / viem            |
| Testing   | Hardhat, Chai               |

---

## Deployment Checklist

### Testnet

- [ ] Deploy all contracts to Selendra testnet
- [ ] Verify contracts on explorer
- [ ] Test registration flow end-to-end
- [ ] Test renewal flow
- [ ] Test resolution

### Mainnet

- [ ] Security audit (optional for v1)
- [ ] Deploy contracts
- [ ] Set initial prices
- [ ] Reserve system names (sel, selendra, admin, etc.)
- [ ] Launch announcement

---

## Success Metrics

| Metric             | Target (3 months) |
| ------------------ | ----------------- |
| Domains registered | 1,000+            |
| Unique owners      | 500+              |
| Renewal rate       | >50%              |
| SDK downloads      | 100+              |

---

## Timeline

| Phase               | Duration | Status         |
| ------------------- | -------- | -------------- |
| Phase 1: Foundation | Complete | ✅             |
| Phase 2: Web App    | 2 weeks  | 🔄 In Progress |
| Phase 3: Resolution | 1 week   | ⏳ Planned     |
| Phase 4: SDK        | 2 weeks  | ⏳ Planned     |
| Phase 5: Renewals   | 1 week   | ⏳ Planned     |

**Target Launch: Q1 2026**
