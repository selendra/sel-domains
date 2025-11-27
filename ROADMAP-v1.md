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

## Phase 2: Web App ✅

### Landing Page ✅

- [x] Hero with domain search
- [x] Pricing display
- [x] Features overview
- [x] FAQ section

### Domain Search ✅

- [x] Real-time availability check (contract integration)
- [x] Price calculation with year selector
- [x] Mock data fallback when wallet not connected

### Registration Flow ✅

- [x] Connect wallet (RainbowKit + wagmi)
- [x] Select registration period (1-10 years)
- [x] Review price and confirm
- [x] Commit-reveal transaction flow
- [x] Success confirmation with domain details

### Domain Management ✅

- [x] View owned domains (/my-domains)
- [x] Set primary address
- [x] Renew domains
- [x] Transfer ownership
- [x] Edit text records

---

## Phase 3: Resolution ✅

### Address Resolution ✅

- [x] Forward lookup: alice.sel → 0x1234... (/lookup)
- [x] Reverse lookup: 0x1234... → alice.sel
- [x] Address display component with identicon

### Records ✅

- [x] Set/update address records
- [x] Text records (email, url, avatar, twitter, github, etc.)
- [ ] Content hash (IPFS/ARWEAVE) - deferred to v2

---

## Phase 4: SDK & Integration

### JavaScript SDK

```typescript
import { SNS } from "@selendrajs/sns";

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

| Phase               | Duration | Status     |
| ------------------- | -------- | ---------- |
| Phase 1: Foundation | Complete | ✅         |
| Phase 2: Web App    | 2 weeks  | ✅         |
| Phase 3: Resolution | 1 week   | ✅         |
| Phase 4: SDK        | 2 weeks  | ⏳ Planned |
| Phase 5: Renewals   | 1 week   | ⏳ Planned |

**Target Launch: Q1 2026**
