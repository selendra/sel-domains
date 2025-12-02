# Selendra Naming Service (SNS) MetaMask Snap

A MetaMask Snap that enables `.sel` domain resolution in MetaMask for the Selendra network.

## Overview

This Snap implements custom name resolution for MetaMask, allowing users to:

- **Forward Resolution**: Resolve `.sel` domains to wallet addresses (e.g., `alice.sel` → `0x123...`)
- **Reverse Resolution**: Resolve addresses to `.sel` domain names (e.g., `0x123...` → `alice.sel`)

## How It Works

MetaMask doesn't natively support ENS on custom networks. However, MetaMask Snaps provide an official way to add custom domain resolution through the `onNameLookup` handler.

When a user types a `.sel` domain in MetaMask's send field:

1. MetaMask detects the `.sel` TLD and routes the request to this Snap
2. The Snap computes the namehash (EIP-137) of the domain
3. It queries the SNS Registry on Selendra to get the resolver
4. It calls `addr(bytes32)` on the resolver to get the mapped address
5. The address is returned to MetaMask for display

```
User types "alice.sel" → MetaMask → SNS Snap → SNS Registry → Resolver → Address
```

## Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Selendra Mainnet | 1961 | Coming Soon |
| Selendra Testnet | 1953 | ✅ Active |

## Installation

### For Users

1. Open MetaMask and navigate to the Snaps directory
2. Search for "Selendra Naming Service" or visit the Snap's page
3. Click "Install" and approve the permissions
4. Start using `.sel` domains!

### For Development

```bash
# Clone the repository
cd snap

# Install dependencies
yarn install

# Build the Snap
yarn build

# Start the development server
yarn start
```

### Testing Locally with MetaMask Flask

1. Install [MetaMask Flask](https://metamask.io/flask/) (developer version of MetaMask)
2. Run `yarn start` to start the Snap server on port 8080
3. In MetaMask Flask, go to Settings → Snaps → Install from URL
4. Enter `http://localhost:8080`
5. Approve the installation

## Permissions

This Snap requires the following permissions:

| Permission | Description |
|------------|-------------|
| `endowment:name-lookup` | Required to provide custom name resolution |
| `endowment:network-access` | Required to make RPC calls to Selendra network |

The Snap only handles:
- Chains: `eip155:1961` (Mainnet), `eip155:1953` (Testnet)
- TLDs: `.sel` domains only

## Technical Details

### Namehash Algorithm (EIP-137)

The Snap implements the standard ENS namehash algorithm:

```typescript
namehash("") = bytes32(0)
namehash("alice.sel") = keccak256(namehash("sel"), keccak256("alice"))
```

### Contract Interfaces

The Snap interacts with:

1. **SNS Registry** (`resolver(bytes32)`)
   - Gets the resolver contract for a domain

2. **Resolver** (`addr(bytes32)`)
   - EIP-137 compliant address resolution

## Development

### Project Structure

```
snap/
├── src/
│   ├── index.ts          # Main Snap entry point
│   └── index.test.ts     # Tests
├── snap.manifest.json    # Snap manifest
├── snap.config.ts        # Build configuration
├── package.json
└── README.md
```

### Running Tests

```bash
yarn test
```

### Building for Production

```bash
yarn build
```

The built Snap will be in `dist/bundle.js`.

## Publishing

### To npm

```bash
# Login to npm (if not already)
npm login

# Build and publish
./publish.sh
# Or manually:
npm run build:clean
npm publish --access public
```

### To MetaMask Snaps Directory

After publishing to npm:

1. Visit [MetaMask Snaps Directory Submission](https://snaps.metamask.io/submit)
2. Fill in the submission form:
   - **Name**: Selendra Naming Service (SNS)
   - **npm package**: @selendra/sns-snap
   - **Description**: Resolve .sel domains on Selendra Network to wallet addresses
   - **Category**: Naming / Name Resolution
   - **Chains**: Selendra Mainnet (1961), Selendra Testnet (1953)
3. Submit for review
4. Wait for approval (typically 1-2 weeks)

## Contract Addresses

### Testnet (Chain ID: 1953)

| Contract | Address |
|----------|---------|
| SNS Registry | `0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a` |
| MultiChain Resolver | `0x39f8bB3627d84092572304Ed01f1532855775207` |

### Mainnet (Chain ID: 1961)

*Coming soon after mainnet deployment*

## Related Resources

- [Selendra Naming Service SDK](../sdk/)
- [SNS Web App](../web/)
- [MetaMask Snaps Documentation](https://docs.metamask.io/snaps/)
- [EIP-137: Ethereum Domain Name Service](https://eips.ethereum.org/EIPS/eip-137)

## License

MIT-0 OR Apache-2.0
