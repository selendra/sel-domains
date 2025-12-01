# Selendra Naming Service (SNS)

> Human-readable `.sel` domains for Selendra addresses

## What is SNS?

SNS maps human-readable names to blockchain addresses:

| Without SNS | With SNS |
|-------------|----------|
| `0x742d35Cc6634C0532925a3b844Bc9e7595f...` | `alice.sel` |

## Features

- 🔒 **Commit-reveal** registration (front-running protection)
- 🎨 **ERC-721 NFT** ownership (tradeable domains)
- 📝 **Text records** (email, URL, avatar, social links)
- 🔄 **Reverse resolution** (address → name)
- ⏰ **10-second** commitment wait (optimized for Selendra's 1s blocks)

## Pricing

| Length | Price/Year |
|--------|------------|
| 3 chars | 1,000 SEL |
| 4 chars | 250 SEL |
| 5+ chars | 50 SEL |

## Quick Start

### Run Tests
```bash
forge test
```

### Deploy to Testnet
```bash
source .env
forge script script/DeploySNS.s.sol:DeploySNS \
  --rpc-url https://rpc-testnet.selendra.org \
  --broadcast --private-key $PRIVATE_KEY --legacy
```

### Run Web App
```bash
cd web && npm install && npm run dev
```

## Project Structure

```
sel-domains/
├── src/                    # Solidity contracts
│   ├── SNSRegistry.sol     # Core registry
│   ├── BaseRegistrar.sol   # ERC-721 NFT ownership
│   ├── SELRegistrarController.sol  # Registration logic
│   ├── PublicResolver.sol  # Records storage
│   └── PriceOracle.sol     # Pricing
├── test/                   # Foundry tests
├── script/                 # Deployment scripts
├── sdk/                    # TypeScript SDK
├── web/                    # Next.js frontend
└── docs/                   # Documentation
```

## Testnet Deployment

| Contract | Address |
|----------|---------|
| SNSRegistry | `0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a` |
| BaseRegistrar | `0xbF0AF7D1b5a6F17A9C6448375B0f1c4788a27Ff6` |
| SELRegistrarController | `0xC202368044C4e633B5585D3e9498E421b5955D8E` |
| PublicResolver | `0xFE6c7Ed8FA52FEA2149fd98a60a8e986DBEa0f8a` |
| PriceOracle | `0x81eBB2a59e61D268c47f4F707e7D4f2aAfd9b890` |
| ReverseRegistrar | `0xB708898adFeAC80aA1F9cD1Da2B3113d7f5B825E` |

**Network:** Selendra Testnet (Chain ID: 1953)  
**RPC:** https://rpc-testnet.selendra.org

## Documentation

- [Design](docs/design.md) - Architecture overview
- [Technical](docs/tech.md) - Implementation details
- [Tasks](docs/tasks.md) - Roadmap & backlog
- [Testing](TESTING.md) - Testing guide

## License

MIT
