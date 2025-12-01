# SNS (Selendra Naming Service) - Testing Guide

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet
- Testnet SEL tokens (get from faucet)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd sel-domains
   ```

2. **Install web dependencies:**
   ```bash
   cd web
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```
   
   Or use the generator script:
   ```bash
   cd ..
   ./script/generate-env.sh testnet
   ```

4. **Start the dev server:**
   ```bash
   cd web
   npm run dev -- -p 3003
   ```

5. **Open in browser:**
   ```
   http://localhost:3003
   ```

---

## Network Configuration

### Selendra Testnet
| Setting | Value |
|---------|-------|
| Network Name | Selendra Testnet |
| RPC URL | `https://rpc-testnet.selendra.org` |
| Chain ID | `1953` |
| Currency Symbol | SEL |
| Block Explorer | https://testnet.selendra.org |

### Add to MetaMask
The app will prompt you to add/switch to Selendra Testnet automatically.

### Get Testnet SEL
Visit the faucet: https://faucet.selendra.org

---

## Testing the Registration Flow

### Step 1: Search for a Domain
1. Go to homepage
2. Enter a domain name (e.g., `myname`)
3. Click "Search" or press Enter
4. Verify it shows as "Available"

### Step 2: Start Registration
1. Click "Register" on an available domain
2. Connect your wallet if not connected
3. Select registration period (1-5 years)
4. Review the price breakdown
5. Click "Begin Registration"

### Step 3: Commit Transaction
1. **Sign the commit transaction** in your wallet
2. Wait for transaction confirmation (~6 seconds)
3. You'll see "Commit Transaction: Confirmed"

### Step 4: Wait Period
1. A 60-second countdown will appear
2. **Don't close the page** - state is saved to localStorage
3. If you refresh, it will resume from where you left off

### Step 5: Complete Registration
1. After 60 seconds, click "Complete Registration"
2. **Sign the register transaction** in your wallet
3. This transaction requires payment (SEL)
4. Wait for confirmation

### Step 6: Success!
1. You'll see a congratulations screen
2. Your domain is now registered
3. Click "View Domain" or "Manage Domain"

---

## Pricing

| Name Length | Price per Year |
|-------------|----------------|
| 3 characters | 1000 SEL |
| 4 characters | 250 SEL |
| 5+ characters | 50 SEL |

Multi-year discount: **10% off** for 2+ years

---

## Test Cases

### ✅ Happy Path
- [ ] Search for available domain
- [ ] Complete full registration flow
- [ ] Verify domain appears in "My Domains"
- [ ] Set primary name (reverse record)

### ✅ Edge Cases
- [ ] Search for taken domain (shows "Registered")
- [ ] Try registering with insufficient balance
- [ ] Refresh page during wait period (should resume)
- [ ] Close and reopen during wait period (should resume)
- [ ] Try 3-character domain (premium pricing)

### ✅ Validation
- [ ] Names < 3 characters rejected
- [ ] Names > 63 characters rejected
- [ ] Special characters rejected (only a-z, 0-9, hyphen)
- [ ] Leading/trailing hyphens rejected

### ✅ Wallet States
- [ ] Not connected → shows connect prompt
- [ ] Wrong network → shows "Switch to Selendra" button
- [ ] Wallet disconnect during flow → handles gracefully

---

## Troubleshooting

### "No commitment found" error
**Cause:** The commit and register steps used different parameters (usually the secret).

**Fix:** Clear localStorage and try again:
```javascript
// In browser console
localStorage.removeItem('sns_registration_state')
```
Then refresh and start a new registration.

### Transaction stuck on "Confirming"
**Cause:** Selendra blocks are ~6 seconds. The app polls every 2 seconds.

**Fix:** Wait up to 30 seconds. If still stuck, check the explorer for tx status.

### "Insufficient payment" error
**Cause:** SEL balance too low for the domain price.

**Fix:** Get more testnet SEL from the faucet.

### Page shows wrong step after refresh
**Cause:** localStorage state mismatch.

**Fix:** Clear localStorage:
```javascript
localStorage.removeItem('sns_registration_state')
```

---

## Deployed Contracts (Testnet)

| Contract | Address |
|----------|---------|
| SNSRegistry | `0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a` |
| PublicResolver | `0xFE6c7Ed8FA52FEA2149fd98a60a8e986DBEa0f8a` |
| BaseRegistrar | `0xbF0AF7D1b5a6F17A9C6448375B0f1c4788a27Ff6` |
| PriceOracle | `0x81eBB2a59e61D268c47f4F707e7D4f2aAfd9b890` |
| SELRegistrarController | `0x76B2F67AE09E2956967DF4303d9e914791B323dC` |
| ReverseRegistrar | `0xB708898adFeAC80aA1F9cD1Da2B3113d7f5B825E` |

---

## Debug Tools

### Check commitment on-chain
```bash
# Check if a commitment exists (returns timestamp, 0 if not found)
cast call 0x76B2F67AE09E2956967DF4303d9e914791B323dC \
  "commitments(bytes32)(uint256)" \
  <COMMITMENT_HASH> \
  --rpc-url https://rpc-testnet.selendra.org
```

### Check domain availability
```bash
cast call 0x76B2F67AE09E2956967DF4303d9e914791B323dC \
  "available(string)(bool)" \
  "myname" \
  --rpc-url https://rpc-testnet.selendra.org
```

### Check domain price
```bash
# Price for 1 year (31536000 seconds)
cast call 0x76B2F67AE09E2956967DF4303d9e914791B323dC \
  "rentPrice(string,uint256)(uint256,uint256)" \
  "myname" 31536000 \
  --rpc-url https://rpc-testnet.selendra.org
```

### Browser Console Logs
The app logs debug info to console:
- `[SNS] Commit params: {...}` - Parameters used for commit
- `[SNS] Register params: {...}` - Parameters used for register
- `[SNS] Register price: {...}` - Price breakdown

---

## Contact

If you encounter issues not covered here, please open a GitHub issue with:
1. Browser console logs
2. Network requests (Network tab)
3. localStorage state: `localStorage.getItem('sns_registration_state')`
4. Transaction hash (if available)
