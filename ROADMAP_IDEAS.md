# .sel Domains - Future Ideas

Ideas and possibilities for .sel domains. These are explorations, not commitments.

---

## Identity

### Profiles

- Store display name, bio, avatar on-chain
- dApps can read profile data automatically
- Social links (Twitter, Telegram, GitHub)

### Verified Badges

- KYC verification badge
- Developer badge
- DAO member badge
- Custom badges from trusted issuers

### .sel Login

- Sign into dApps with your .sel name
- No passwords, no email
- User controls what data to share

---

## Subdomains

### How It Could Work

```
company.sel
  ├── alice.company.sel (employee)
  ├── support.company.sel (contact)
  └── api.company.sel (service)
```

### Options

- Free subdomains for team members
- Sell subdomains for SEL
- Rent subdomains monthly
- DAO membership via subdomains

---

## Payments

### Payment Links

```
alice.sel/pay?amount=100&memo=coffee
```

### Invoicing

- Create invoice tied to your .sel
- Track payment status on-chain

### Splitting

- Split payment between multiple .sel addresses

---

## Social Recovery

### Concept

If you lose your keys, trusted contacts can help recover your domain.

### How It Might Work

- Set 5 guardians (friends, family)
- 3 of 5 must approve recovery
- 7-day delay (owner can cancel if compromised)
- Domain transfers to new address

---

## Decentralized Websites

### IPFS Hosting

```
alice.sel → ipfs://QmXyz...
```

### DNS Bridge

Access via normal browser:

```
alice.sel.link
```

---

## Khmer Support

### Khmer Script Domains

```
សេលេន្រ្ទា.sel
ភ្នំពេញ.sel
```

### Challenges to Solve

- Homograph attack prevention
- Unicode normalization
- Keyboard input support

---

## Messaging

### On-chain Messages

- Send encrypted messages to alice.sel
- Public inbox for contact requests

### Domain Chat

- Chat rooms for subdomain communities
- \*.dao.sel members can chat together

---

## NFT Features

### Domain as NFT

- Trade domains on marketplaces
- Set royalties on resale
- Visual domain badges

### Portfolio Display

- alice.sel shows owned NFTs
- Curated collection display

---

## Governance

### What Holders Could Vote On

- Pricing changes
- Protocol upgrades
- Reserved name policies
- Fee distribution

### Voting Models

- 1 domain = 1 vote
- 1 address = 1 vote
- Quadratic voting

---

## Privacy

### Private Resolution

- Encrypted records only revealed to authorized parties

### Stealth Addresses

- Generate one-time addresses from alice.sel
- Receive payments without linking to main address

### Domain Locking

- Prevent transfers for X days
- Anti-theft protection

---

## Enterprise

### Brand Protection

- Trademark claim process
- Priority registration for verified businesses

### Team Management

- Bulk subdomain creation
- Role-based access

### API Access

- Higher rate limits
- Dedicated support

---

## Developer Tools

### Testnet Domains

- Free .sel.test domains for development

### Batch Operations

- Register/renew multiple domains in one transaction

### Webhooks

- Notify your server on domain events
- Registration, transfer, expiry alerts

### SDK Features

```typescript
// Multi-chain resolution
const addresses = await sns.resolveAll("alice.sel");
// { sel: '0x...', eth: '0x...', btc: 'bc1...' }

// Profile data
const profile = await sns.getProfile("alice.sel");
// { name, bio, avatar, socials }

// Reverse lookup
const name = await sns.reverse("0x1234...");
// 'alice.sel'
```

---

## Integrations

### Selendra Ecosystem

- Bitriel Wallet: native .sel support
- Block Explorer: show .sel instead of addresses
- DEX: trade with alice.sel

### External

- Telegram bot for lookups
- Discord verification
- GitHub profile links

---

## Use Case Ideas

| Category | Examples                          |
| -------- | --------------------------------- |
| Personal | alice.sel, dev.sel, artist.sel    |
| Business | shop.sel, agency.sel, studio.sel  |
| DAOs     | member.dao.sel, vote.dao.sel      |
| Gaming   | player.game.sel, guild.game.sel   |
| IoT      | sensor.home.sel, device.fleet.sel |

---

## Revenue Ideas

| Source                 | Notes                  |
| ---------------------- | ---------------------- |
| Registration fees      | Current model          |
| Premium auctions       | For 3-4 char names     |
| Subdomain platform fee | 10% of subdomain sales |
| Enterprise plans       | Higher limits, support |

### Fee Distribution Ideas

- 80% burn (deflationary)
- 20% treasury (development)

---

## Open Questions

1. How to prevent squatting effectively?
2. Price in SEL or USD-stable equivalent?
3. How to handle trademark disputes?
4. When/how to introduce governance?
5. Cross-chain resolution - which chains to support?

---

## References

- [ENS Documentation](https://docs.ens.domains)
- [Unstoppable Domains](https://unstoppabledomains.com)
- [SpaceID](https://space.id)
- [Bonfida (Solana)](https://naming.bonfida.org)
