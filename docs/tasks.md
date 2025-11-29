# SNS Tasks & Roadmap

> Consolidated tasks for Selendra Naming Service development

## Status Legend

- ✅ Complete
- 🔄 In Progress
- ⏳ Planned
- 💡 Idea (not committed)

---

## Phase 1: Core Contracts ✅

### Smart Contracts

- [x] SNSRegistry - Core registry contract
- [x] BaseRegistrar - ERC-721 domain ownership
- [x] SELRegistrarController - Commit-reveal registration
- [x] PublicResolver - Address/text/contenthash records
- [x] ReverseRegistrar - Address → name lookup
- [x] PriceOracle - Length-based pricing

### Pricing

| Length   | Price/Year | Status |
| -------- | ---------- | ------ |
| 3 chars  | 1,000 SEL  | ✅     |
| 4 chars  | 250 SEL    | ✅     |
| 5+ chars | 50 SEL     | ✅     |

---

## Phase 2: Foundry Migration ✅

### Setup

- [x] Install Foundry toolchain
- [x] Create `foundry.toml` configuration
- [x] Set up remappings for OpenZeppelin
- [x] Move contracts from `contracts/` to `src/`
- [x] Remove legacy Hardhat files

### Tests

- [x] Create `SNSRegistry.t.sol` (15 tests)
- [x] Create `BaseRegistrar.t.sol` (18 tests)
- [x] Create `SELRegistrarController.t.sol` (19 tests)
- [x] Create `PublicResolver.t.sol` (10 tests)
- [x] All 62 tests passing

### Deployment

- [x] Create `DeploySNS.s.sol` script
- [x] Create `AddController.s.sol` for post-deploy setup
- [x] Create `deploy-testnet.sh` shell script
- [x] Test deployment on local Anvil
- [x] Deploy to Selendra testnet with Foundry
- [ ] Verify contracts on explorer

---

## Phase 3: SDK with Viem ✅

### Core SDK

- [x] Set up SDK project structure (`sdk/`)
- [x] Implement `SNS` client class
- [x] Generate TypeScript types from ABIs

### Read Operations

- [x] `getAddress(domain)` - Name to address
- [x] `getDomainInfo(name)` - Comprehensive domain info
- [x] `isAvailable(name)` - Check availability
- [x] `getPrice(name, duration)` - Get registration price
- [x] `getText(name, key)` - Get text record
- [x] `getOwner(domain)` - Get domain owner
- [x] `getResolver(domain)` - Get resolver address
- [x] `getExpiry(name)` - Get expiry timestamp

### Write Operations

- [x] `commit(commitment)` - Submit commitment
- [x] `makeCommitment(...)` - Create commitment hash
- [x] `register(name, ...)` - Register domain
- [x] `registerWithCommit(name, ...)` - Auto commit+wait+register
- [x] `renew(name, duration)` - Renew domain
- [x] `setAddress(name, address)` - Set address record
- [x] `setText(name, key, value)` - Set text record
- [x] `transfer(name, newOwner)` - Transfer domain

### Utilities

- [x] `namehash(name)` - Calculate namehash
- [x] `labelhash(label)` - Calculate labelhash
- [x] `labelToTokenId(label)` - Get ERC-721 token ID
- [x] `isValidName(name)` - Validate name format
- [x] `normalizeName(name)` - Normalize name (lowercase, trim)
- [x] `parseDomain(domain)` - Parse label and TLD
- [x] `reverseNode(address)` - Calculate reverse node
- [x] `formatDuration(seconds)` - Human-readable duration
- [x] `generateSecret()` - Random commitment secret

---

## Phase 4: Testnet Deployment ✅

### Pre-deployment

- [x] Final contract review
- [x] Test all flows on local fork
- [x] Prepare deployment script

### Deployment

- [x] Deploy all contracts to testnet
- [x] Configure contract relationships
- [ ] Verify contracts on explorer
- [x] Save deployment addresses

### Post-deployment

- [x] End-to-end testing
- [x] Register test domains
- [ ] Test resolution flows
- [ ] Test renewal flows

### Reserved Names (Testnet)

- [x] selendra.sel
- [x] testdomain.sel
- [ ] sel.sel (3-char = 1000 SEL)
- [ ] admin.sel
- [ ] support.sel
- [ ] wallet.sel

---

## Phase 5: Web App ✅

### Landing Page

- [x] Hero with domain search
- [x] Pricing display
- [x] Features overview
- [x] FAQ section

### Domain Search

- [x] Real-time availability check
- [x] Price calculation
- [x] Year selector (1-10 years)

### Registration Flow

- [x] Connect wallet (RainbowKit)
- [x] Review and confirm
- [x] Commit-reveal transactions
- [x] Success confirmation

### Domain Management

- [x] View owned domains (/my-domains)
- [x] Set primary address
- [x] Renew domains
- [x] Transfer ownership
- [x] Edit text records

---

## Phase 6: Mainnet Launch ⏳

### Pre-launch

- [ ] Security audit (optional for v1)
- [ ] Final testing on testnet
- [ ] Prepare mainnet deployment

### Deployment

- [ ] Deploy contracts to mainnet
- [ ] Verify contracts
- [ ] Configure pricing

### Reserved Names

Reserve system names before public launch:

- [ ] sel
- [ ] selendra
- [ ] admin
- [ ] support
- [ ] help
- [ ] dns
- [ ] registry
- [ ] resolver
- [ ] wallet
- [ ] exchange

### Launch

- [ ] Enable public registration
- [ ] Announce launch
- [ ] Monitor for issues

---

## Phase 7: SDK Distribution ⏳

### NPM Package

- [ ] Set up npm publishing
- [ ] Create package documentation
- [ ] Publish `@selendra/sns-sdk`

### Documentation

- [ ] SDK usage examples
- [ ] API reference
- [ ] Integration guides

---

## Future Ideas 💡

### Subdomains

```
company.sel
├── alice.company.sel
├── bob.company.sel
└── support.company.sel
```

- [ ] Subdomain registration
- [ ] Owner-controlled pricing
- [ ] DAO-based subdomains

### Multi-chain Support

- [ ] ETH addresses (coin type 60)
- [ ] BTC addresses (coin type 0)
- [ ] Multi-chain resolver

### Identity Features

- [ ] Profile data (name, bio, avatar)
- [ ] Social links
- [ ] Verified badges

### Privacy

- [ ] Private resolution
- [ ] Stealth addresses

### v2: Native Pallet

Move from EVM to native Substrate pallet:

- [ ] Implement `pallet-sns`
- [ ] EVM precompile bridge
- [ ] Data migration
- [ ] Lower gas costs
- [ ] Free resolution via runtime API

---

## Technical Debt

### High Priority

- [x] Fix BaseRegistrar.registerWithConfig() - now uses setSubnodeRecord for atomic operation
- [ ] Add comprehensive error messages
- [ ] Gas optimization pass

### Medium Priority

- [ ] Add events for all state changes
- [ ] Improve natspec documentation
- [ ] Add multicall support

### Low Priority

- [ ] Consider upgradeable contracts
- [ ] Add batch operations
- [ ] Implement EIP-2544 (wildcard resolution)

---

## Success Metrics

| Metric             | Target (3 months) |
| ------------------ | ----------------- |
| Domains registered | 1,000+            |
| Unique owners      | 500+              |
| Renewal rate       | >50%              |
| SDK downloads      | 100+              |
| dApp integrations  | 5+                |

---

## Timeline

| Phase                       | Duration | Target   |
| --------------------------- | -------- | -------- |
| Phase 1: Core Contracts     | Complete | ✅       |
| Phase 2: Foundry Migration  | 1 week   | Dec 2025 |
| Phase 3: SDK with Viem      | 1 week   | Dec 2025 |
| Phase 4: Testnet Deployment | 3 days   | Dec 2025 |
| Phase 5: Web App            | Complete | ✅       |
| Phase 6: Mainnet Launch     | 1 week   | Jan 2026 |
| Phase 7: SDK Distribution   | 3 days   | Jan 2026 |

**Target Mainnet Launch: Q1 2026**
