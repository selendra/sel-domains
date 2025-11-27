# .sel Domains - v2 Roadmap (pallet-sns)

Upgrade SNS to a native Substrate pallet while keeping the same UX for users and developers.

---

## Overview

v2 moves the SNS registry from EVM contracts to a native `pallet-sns`, but users and developers won't notice any difference:

- **Users** still use MetaMask, same UI, same flow
- **Developers** still use the same Solidity interface
- **Backend** is now native Substrate (faster, cheaper, more features)

```
┌─────────────────────────────────────────────────────────────┐
│                        USER / DAPP                          │
│                    (No changes needed)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              EVM Interface (Same as v1)                     │
│   SELRegistrarController.sol  →  SNS Precompile             │
│   PublicResolver.sol          →  SNS Precompile             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     pallet-sns (NEW)                        │
│   Native registry, resolution, pricing                      │
└─────────────────────────────────────────────────────────────┘
```

---

## What Changes (Backend)

| Component    | v1 (EVM)                   | v2 (Pallet)            |
| ------------ | -------------------------- | ---------------------- |
| Registry     | SNSRegistry.sol            | pallet-sns storage     |
| Registration | SELRegistrarController.sol | pallet-sns extrinsic   |
| Resolution   | PublicResolver.sol         | pallet-sns runtime API |
| Pricing      | PriceOracle.sol            | pallet-sns config      |
| Reverse      | ReverseRegistrar.sol       | pallet-sns storage     |

---

## What Stays the Same (UX)

| For Users | Same                           |
| --------- | ------------------------------ |
| Wallet    | MetaMask, WalletConnect        |
| UI        | Same web app                   |
| Flow      | Search → Register → Pay → Done |
| Fees      | Paid in SEL (lower gas)        |

| For Developers   | Same                            |
| ---------------- | ------------------------------- |
| Interface        | Same Solidity ABI               |
| SDK              | Same `sns.resolve("alice.sel")` |
| Contract Address | Same (precompile proxy)         |
| Events           | Same event signatures           |

---

## Architecture

### EVM Precompile (Bridge)

The existing Solidity interface calls a precompile that routes to `pallet-sns`:

```
┌──────────────────────────────────────────────────────────────┐
│                     EVM Contract Call                        │
│         controller.register("alice", 1 year)                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│               SNS Precompile (0x...0808)                     │
│   Maps Solidity calls → pallet-sns extrinsics                │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      pallet-sns                              │
│   Pallet::register(origin, name, duration)                   │
└──────────────────────────────────────────────────────────────┘
```

### Precompile Address

Fixed address for SNS precompile:

```
0x0000000000000000000000000000000000000808
```

Existing contracts can be updated to point here, or we deploy proxy contracts at the same v1 addresses.

---

## Precompile Interface

Same Solidity interface as v1:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISNSPrecompile {
    // === Registration ===
    function register(
        string calldata name,
        address owner,
        uint256 duration
    ) external payable returns (uint256 tokenId);

    function renew(
        string calldata name,
        uint256 duration
    ) external payable;

    // === Resolution ===
    function resolve(string calldata name) external view returns (address);
    function reverseResolve(address addr) external view returns (string memory);

    // === Availability ===
    function available(string calldata name) external view returns (bool);
    function nameExpires(string calldata name) external view returns (uint256);

    // === Pricing ===
    function price(
        string calldata name,
        uint256 duration
    ) external view returns (uint256);

    // === Records ===
    function setAddr(string calldata name, address addr) external;
    function setText(string calldata name, string calldata key, string calldata value) external;
    function text(string calldata name, string calldata key) external view returns (string memory);

    // === Ownership ===
    function owner(string calldata name) external view returns (address);
    function transfer(string calldata name, address newOwner) external;

    // === Events (same as v1) ===
    event NameRegistered(string indexed name, address indexed owner, uint256 expires);
    event NameRenewed(string indexed name, uint256 expires);
    event NameTransferred(string indexed name, address indexed newOwner);
    event AddrChanged(string indexed name, address addr);
    event TextChanged(string indexed name, string indexed key, string value);
}
```

---

## pallet-sns Design

### Config

```rust
#[pallet::config]
pub trait Config: frame_system::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    type Currency: Currency<Self::AccountId>;

    /// Maximum name length (without .sel)
    #[pallet::constant]
    type MaxNameLength: Get<u32>;  // 64

    /// Maximum text record length
    #[pallet::constant]
    type MaxRecordLength: Get<u32>;  // 256

    /// Minimum registration duration (1 year in blocks)
    #[pallet::constant]
    type MinDuration: Get<Self::BlockNumber>;

    /// Grace period after expiry
    #[pallet::constant]
    type GracePeriod: Get<Self::BlockNumber>;  // 30 days

    /// Treasury account for fees
    type Treasury: Get<Self::AccountId>;

    /// Fee burn percentage (0-100)
    #[pallet::constant]
    type BurnPercent: Get<u8>;  // 80
}
```

### Storage

```rust
/// Domain information
#[pallet::storage]
pub type Domains<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    BoundedVec<u8, T::MaxNameLength>,  // name
    DomainInfo<T::AccountId, T::BlockNumber>,
>;

#[derive(Encode, Decode, Clone, TypeInfo, MaxEncodedLen)]
pub struct DomainInfo<AccountId, BlockNumber> {
    pub owner: AccountId,
    pub expires: BlockNumber,
    pub resolver: AccountId,  // usually same as owner
}

/// Address records (name → address)
#[pallet::storage]
pub type AddressRecords<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    BoundedVec<u8, T::MaxNameLength>,
    T::AccountId,
>;

/// Text records (name → key → value)
#[pallet::storage]
pub type TextRecords<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat,
    BoundedVec<u8, T::MaxNameLength>,  // name
    Blake2_128Concat,
    BoundedVec<u8, ConstU32<32>>,      // key
    BoundedVec<u8, T::MaxRecordLength>, // value
>;

/// Reverse records (address → name)
#[pallet::storage]
pub type ReverseRecords<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    BoundedVec<u8, T::MaxNameLength>,
>;

/// Pricing tiers (length → price per year)
#[pallet::storage]
pub type Prices<T: Config> = StorageMap<
    _,
    Twox64Concat,
    u8,  // name length
    BalanceOf<T>,
>;
```

### Extrinsics

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Register a new domain
    #[pallet::call_index(0)]
    #[pallet::weight(T::WeightInfo::register())]
    pub fn register(
        origin: OriginFor<T>,
        name: BoundedVec<u8, T::MaxNameLength>,
        duration: T::BlockNumber,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        // Validate name
        ensure!(Self::is_valid_name(&name), Error::<T>::InvalidName);
        ensure!(Self::is_available(&name), Error::<T>::NameTaken);

        // Calculate and charge fee
        let fee = Self::calculate_price(&name, duration)?;
        Self::charge_fee(&who, fee)?;

        // Register domain
        let expires = frame_system::Pallet::<T>::block_number() + duration;
        Domains::<T>::insert(&name, DomainInfo {
            owner: who.clone(),
            expires,
            resolver: who.clone(),
        });
        AddressRecords::<T>::insert(&name, &who);

        Self::deposit_event(Event::NameRegistered {
            name: name.to_vec(),
            owner: who,
            expires
        });
        Ok(())
    }

    /// Renew a domain
    #[pallet::call_index(1)]
    #[pallet::weight(T::WeightInfo::renew())]
    pub fn renew(
        origin: OriginFor<T>,
        name: BoundedVec<u8, T::MaxNameLength>,
        duration: T::BlockNumber,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        let mut info = Domains::<T>::get(&name).ok_or(Error::<T>::NameNotFound)?;

        // Calculate and charge fee
        let fee = Self::calculate_price(&name, duration)?;
        Self::charge_fee(&who, fee)?;

        // Extend expiry
        info.expires = info.expires.saturating_add(duration);
        Domains::<T>::insert(&name, info.clone());

        Self::deposit_event(Event::NameRenewed {
            name: name.to_vec(),
            expires: info.expires
        });
        Ok(())
    }

    /// Set address record
    #[pallet::call_index(2)]
    #[pallet::weight(T::WeightInfo::set_addr())]
    pub fn set_addr(
        origin: OriginFor<T>,
        name: BoundedVec<u8, T::MaxNameLength>,
        addr: T::AccountId,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;
        Self::ensure_owner(&name, &who)?;

        AddressRecords::<T>::insert(&name, &addr);

        Self::deposit_event(Event::AddrChanged {
            name: name.to_vec(),
            addr
        });
        Ok(())
    }

    /// Set text record
    #[pallet::call_index(3)]
    #[pallet::weight(T::WeightInfo::set_text())]
    pub fn set_text(
        origin: OriginFor<T>,
        name: BoundedVec<u8, T::MaxNameLength>,
        key: BoundedVec<u8, ConstU32<32>>,
        value: BoundedVec<u8, T::MaxRecordLength>,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;
        Self::ensure_owner(&name, &who)?;

        TextRecords::<T>::insert(&name, &key, &value);

        Self::deposit_event(Event::TextChanged {
            name: name.to_vec(),
            key: key.to_vec(),
            value: value.to_vec(),
        });
        Ok(())
    }

    /// Transfer domain
    #[pallet::call_index(4)]
    #[pallet::weight(T::WeightInfo::transfer())]
    pub fn transfer(
        origin: OriginFor<T>,
        name: BoundedVec<u8, T::MaxNameLength>,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;
        Self::ensure_owner(&name, &who)?;

        Domains::<T>::mutate(&name, |maybe_info| {
            if let Some(info) = maybe_info {
                info.owner = new_owner.clone();
            }
        });

        Self::deposit_event(Event::NameTransferred {
            name: name.to_vec(),
            new_owner
        });
        Ok(())
    }

    /// Set reverse record
    #[pallet::call_index(5)]
    #[pallet::weight(T::WeightInfo::set_reverse())]
    pub fn set_reverse(
        origin: OriginFor<T>,
        name: BoundedVec<u8, T::MaxNameLength>,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;
        Self::ensure_owner(&name, &who)?;

        ReverseRecords::<T>::insert(&who, &name);
        Ok(())
    }

    /// Update pricing (governance only)
    #[pallet::call_index(10)]
    #[pallet::weight(T::WeightInfo::set_prices())]
    pub fn set_prices(
        origin: OriginFor<T>,
        price_3_char: BalanceOf<T>,
        price_4_char: BalanceOf<T>,
        price_5_plus: BalanceOf<T>,
    ) -> DispatchResult {
        ensure_root(origin)?;

        Prices::<T>::insert(3u8, price_3_char);
        Prices::<T>::insert(4u8, price_4_char);
        Prices::<T>::insert(5u8, price_5_plus);

        Self::deposit_event(Event::PricesUpdated {
            price_3_char,
            price_4_char,
            price_5_plus
        });
        Ok(())
    }
}
```

### Runtime API (Free Queries)

```rust
sp_api::decl_runtime_apis! {
    pub trait SnsApi<AccountId> where AccountId: Codec {
        /// Resolve name to address (free, no gas)
        fn resolve(name: Vec<u8>) -> Option<AccountId>;

        /// Reverse lookup (free, no gas)
        fn reverse(account: AccountId) -> Option<Vec<u8>>;

        /// Check availability
        fn is_available(name: Vec<u8>) -> bool;

        /// Get expiry block
        fn expires(name: Vec<u8>) -> Option<u64>;

        /// Get price for registration
        fn price(name: Vec<u8>, duration_years: u32) -> u128;

        /// Get text record
        fn text(name: Vec<u8>, key: Vec<u8>) -> Option<Vec<u8>>;

        /// Get owner
        fn owner(name: Vec<u8>) -> Option<AccountId>;
    }
}
```

---

## Precompile Implementation

```rust
pub struct SnsPrecompile<R>(PhantomData<R>);

impl<R> Precompile for SnsPrecompile<R>
where
    R: pallet_sns::Config + pallet_evm::Config,
    R::AccountId: From<H160> + Into<H160>,
{
    fn execute(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        let selector = handle.input().get(0..4).unwrap_or_default();

        match selector {
            // resolve(string) -> address
            [0x5c, 0x23, 0xbf, 0x8e] => Self::resolve(handle),

            // reverseResolve(address) -> string
            [0x23, 0x7e, 0x94, 0x92] => Self::reverse_resolve(handle),

            // register(string,address,uint256)
            [0x85, 0xf6, 0xd1, 0x55] => Self::register(handle),

            // renew(string,uint256)
            [0xac, 0xf1, 0xa8, 0x41] => Self::renew(handle),

            // available(string) -> bool
            [0xae, 0xb8, 0xce, 0x9b] => Self::available(handle),

            // price(string,uint256) -> uint256
            [0x26, 0x75, 0x9a, 0x98] => Self::price(handle),

            // setAddr(string,address)
            [0x8b, 0x95, 0xdd, 0x71] => Self::set_addr(handle),

            // owner(string) -> address
            [0x02, 0x57, 0x17, 0x92] => Self::owner(handle),

            // transfer(string,address)
            [0x1a, 0x69, 0x52, 0x30] => Self::transfer(handle),

            _ => Err(PrecompileFailure::Error {
                exit_status: ExitError::InvalidRange,
            }),
        }
    }
}

impl<R> SnsPrecompile<R>
where
    R: pallet_sns::Config + pallet_evm::Config,
{
    fn resolve(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        // Decode name from input
        let name = Self::decode_string(&handle.input()[4..])?;

        // Call pallet
        let address = pallet_sns::Pallet::<R>::resolve(&name)
            .map(|acc| acc.into())
            .unwrap_or(H160::zero());

        // Encode result
        Ok(PrecompileOutput {
            exit_status: ExitSucceed::Returned,
            output: ethabi::encode(&[Token::Address(address)]),
        })
    }

    fn register(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        // Decode inputs
        let (name, owner, duration) = Self::decode_register_input(&handle.input()[4..])?;

        // Get caller and value
        let caller = handle.context().caller;
        let value = handle.context().apparent_value;

        // Dispatch to pallet
        let origin = RawOrigin::from(caller.into());
        pallet_sns::Pallet::<R>::register(
            origin.into(),
            name.try_into().map_err(|_| PrecompileFailure::Error {
                exit_status: ExitError::InvalidRange,
            })?,
            duration.into(),
        ).map_err(|e| PrecompileFailure::Error {
            exit_status: ExitError::Other(e.into()),
        })?;

        Ok(PrecompileOutput {
            exit_status: ExitSucceed::Returned,
            output: vec![],
        })
    }

    // ... other methods follow same pattern
}
```

---

## Migration Plan

### Phase 1: Deploy Pallet (Week 1-2)

```
v1 EVM Contracts (active)
         ↓
pallet-sns (deployed, empty)
```

- Deploy `pallet-sns` via runtime upgrade
- Pallet is deployed but not used yet
- v1 contracts continue operating normally

### Phase 2: Sync Data (Week 3)

```
v1 EVM Contracts → Snapshot → pallet-sns
```

- Take snapshot of all v1 domain data
- Import into pallet storage via migration extrinsic
- Verify data integrity

```rust
// One-time migration
#[pallet::call_index(99)]
#[pallet::weight(Weight::MAX)]
pub fn migrate_from_evm(
    origin: OriginFor<T>,
    domains: Vec<MigrationData<T::AccountId, T::BlockNumber>>,
) -> DispatchResult {
    ensure_root(origin)?;

    for data in domains {
        Domains::<T>::insert(&data.name, DomainInfo {
            owner: data.owner.clone(),
            expires: data.expires,
            resolver: data.owner.clone(),
        });
        AddressRecords::<T>::insert(&data.name, &data.owner);

        // Migrate text records
        for (key, value) in data.text_records {
            TextRecords::<T>::insert(&data.name, &key, &value);
        }
    }

    Self::deposit_event(Event::MigrationCompleted {
        count: domains.len() as u32
    });
    Ok(())
}
```

### Phase 3: Enable Precompile (Week 4)

```
                    ┌─→ SNS Precompile → pallet-sns (NEW)
Users/dApps ────────┤
                    └─→ v1 Contracts (read-only)
```

- Deploy SNS precompile at `0x...0808`
- Update v1 contracts to proxy to precompile
- New registrations go through pallet
- Old contracts still work for reads

### Phase 4: Full Cutover (Week 5)

```
Users/dApps → SNS Precompile → pallet-sns
```

- All operations through pallet
- v1 contracts deprecated
- Same addresses, same interface

---

## Benefits After Migration

| Benefit                | Impact                                    |
| ---------------------- | ----------------------------------------- |
| **Lower gas**          | ~50-70% cheaper registration/renewal      |
| **Free resolution**    | `api.call.snsApi.resolve()` costs nothing |
| **Native integration** | Works with identity, staking pallets      |
| **Faster finality**    | Block-level instead of EVM execution      |
| **Governance ready**   | Price changes via democracy               |

---

## SDK (No Changes)

The SDK works exactly the same:

```typescript
import { SNS } from "@selendra/sns-sdk";

const sns = new SNS({ provider });

// These calls work identically before and after migration
const available = await sns.isAvailable("alice");
const price = await sns.getPrice("alice", 1);
await sns.register("alice", 1, { value: price });
const address = await sns.resolve("alice.sel");
```

Internally, SDK can optionally use runtime API for free reads:

```typescript
// Free resolution via runtime API (optional optimization)
const address = await api.call.snsApi.resolve("alice");
```

---

## Timeline

| Week | Task                    | Status |
| ---- | ----------------------- | ------ |
| 1-2  | Implement pallet-sns    | ⏳     |
| 2-3  | Implement precompile    | ⏳     |
| 3-4  | Testing on testnet      | ⏳     |
| 4    | Data migration script   | ⏳     |
| 5    | Mainnet runtime upgrade | ⏳     |
| 5    | Enable precompile       | ⏳     |
| 6    | Deprecate v1 contracts  | ⏳     |

**Total: 6 weeks**

---

## Rollback Plan

If issues occur:

1. Disable precompile
2. Re-enable v1 contracts
3. Users/dApps unaffected (same interface)

---

## Success Criteria

- [ ] All v1 domains migrated correctly
- [ ] Registration/renewal works via precompile
- [ ] Resolution returns correct addresses
- [ ] Gas costs reduced by >50%
- [ ] SDK works without changes
- [ ] No user complaints about UX changes
