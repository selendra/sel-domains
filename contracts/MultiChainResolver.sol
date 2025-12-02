// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISNSRegistry} from "./SNSRegistry.sol";

/**
 * @title MultiChain Resolver for SNS
 * @notice ENS-compatible resolver with full EIP-2304 multichain address support
 * @dev Supports addresses for 100+ blockchains via SLIP-44 coin types
 * 
 * Key Features:
 * - EIP-2304 compliant multichain address resolution
 * - ENSIP-1 (addr), ENSIP-5 (text), ENSIP-7 (contenthash), ENSIP-9 (multichain)
 * - Compatible with MetaMask, Rainbow, and other ENS-aware wallets
 */
contract MultiChainResolver {
    ISNSRegistry public immutable sns;

    // ============ Storage ============
    
    // Address records: node => coinType => address (in binary format per EIP-2304)
    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;

    // Text records: node => key => value
    mapping(bytes32 => mapping(string => string)) private _texts;

    // Content hash: node => hash (IPFS, Arweave, etc.)
    mapping(bytes32 => bytes) private _contenthashes;

    // Name record (for reverse resolution): node => name
    mapping(bytes32 => string) private _names;

    // ============ Events (EIP-2304 compliant) ============
    
    // Legacy event for Ethereum address changes (EIP-137)
    event AddrChanged(bytes32 indexed node, address addr);
    
    // Multichain address change event (EIP-2304)
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress);
    
    // Text record change event (EIP-634)
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    
    // Content hash change event (EIP-1577)
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    
    // Name change event (reverse resolution)
    event NameChanged(bytes32 indexed node, string name);

    // ============ SLIP-44 Coin Type Constants ============
    // https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    
    // Major chains
    uint256 public constant COIN_TYPE_BTC = 0;        // Bitcoin
    uint256 public constant COIN_TYPE_LTC = 2;        // Litecoin  
    uint256 public constant COIN_TYPE_DOGE = 3;       // Dogecoin
    uint256 public constant COIN_TYPE_DASH = 5;       // Dash
    uint256 public constant COIN_TYPE_ETH = 60;       // Ethereum/EVM
    uint256 public constant COIN_TYPE_ETC = 61;       // Ethereum Classic
    uint256 public constant COIN_TYPE_ATOM = 118;     // Cosmos
    uint256 public constant COIN_TYPE_ZEC = 133;      // Zcash
    uint256 public constant COIN_TYPE_XRP = 144;      // Ripple
    uint256 public constant COIN_TYPE_BCH = 145;      // Bitcoin Cash
    uint256 public constant COIN_TYPE_XLM = 148;      // Stellar
    uint256 public constant COIN_TYPE_EOS = 194;      // EOS
    uint256 public constant COIN_TYPE_TRX = 195;      // Tron
    uint256 public constant COIN_TYPE_ALGO = 283;     // Algorand
    uint256 public constant COIN_TYPE_DOT = 354;      // Polkadot
    uint256 public constant COIN_TYPE_KSM = 434;      // Kusama
    uint256 public constant COIN_TYPE_FIL = 461;      // Filecoin
    uint256 public constant COIN_TYPE_AR = 472;       // Arweave
    uint256 public constant COIN_TYPE_EGLD = 508;     // MultiversX/Elrond
    uint256 public constant COIN_TYPE_SOL = 501;      // Solana
    uint256 public constant COIN_TYPE_NEAR = 397;     // NEAR Protocol
    uint256 public constant COIN_TYPE_FLOW = 539;     // Flow
    uint256 public constant COIN_TYPE_XTZ = 1729;     // Tezos
    uint256 public constant COIN_TYPE_ADA = 1815;     // Cardano
    uint256 public constant COIN_TYPE_AVAX = 9000;    // Avalanche
    uint256 public constant COIN_TYPE_BNB = 714;      // Binance Chain (BEP2)
    uint256 public constant COIN_TYPE_MATIC = 966;    // Polygon
    uint256 public constant COIN_TYPE_OP = 614;       // Optimism
    uint256 public constant COIN_TYPE_ARB = 9001;     // Arbitrum
    uint256 public constant COIN_TYPE_FTM = 1007;     // Fantom
    uint256 public constant COIN_TYPE_KLAY = 8217;    // Klaytn/Kaia
    uint256 public constant COIN_TYPE_HBAR = 3030;    // Hedera
    uint256 public constant COIN_TYPE_ICP = 223;      // Internet Computer
    uint256 public constant COIN_TYPE_VET = 818;      // VeChain
    uint256 public constant COIN_TYPE_THETA = 500;    // Theta
    uint256 public constant COIN_TYPE_XMR = 128;      // Monero
    uint256 public constant COIN_TYPE_NEO = 888;      // NEO
    uint256 public constant COIN_TYPE_MIOTA = 4218;   // IOTA
    uint256 public constant COIN_TYPE_TON = 607;      // TON
    uint256 public constant COIN_TYPE_APT = 637;      // Aptos
    uint256 public constant COIN_TYPE_SUI = 784;      // Sui
    uint256 public constant COIN_TYPE_SEI = 19000118; // Sei
    uint256 public constant COIN_TYPE_INJ = 22000119; // Injective
    uint256 public constant COIN_TYPE_OSMO = 10000118; // Osmosis
    uint256 public constant COIN_TYPE_LUNA = 330;     // Terra
    uint256 public constant COIN_TYPE_CRO = 394;      // Cronos
    uint256 public constant COIN_TYPE_ROSE = 474;     // Oasis
    uint256 public constant COIN_TYPE_ZIL = 313;      // Zilliqa
    uint256 public constant COIN_TYPE_ONE = 1023;     // Harmony
    uint256 public constant COIN_TYPE_CELO = 52752;   // Celo
    uint256 public constant COIN_TYPE_ASTR = 810;     // Astar
    uint256 public constant COIN_TYPE_GLMR = 1284;    // Moonbeam
    uint256 public constant COIN_TYPE_MOVR = 1285;    // Moonriver
    uint256 public constant COIN_TYPE_CFX = 503;      // Conflux
    uint256 public constant COIN_TYPE_KDA = 626;      // Kadena
    uint256 public constant COIN_TYPE_MINA = 12586;   // Mina
    uint256 public constant COIN_TYPE_STX = 5757;     // Stacks
    uint256 public constant COIN_TYPE_HNS = 5353;     // Handshake
    uint256 public constant COIN_TYPE_CKB = 309;      // Nervos CKB
    uint256 public constant COIN_TYPE_WAVES = 5741564; // Waves
    uint256 public constant COIN_TYPE_QTUM = 2301;    // Qtum
    uint256 public constant COIN_TYPE_KAVA = 459;     // Kava
    
    // Selendra (uses Polkadot ecosystem convention)
    uint256 public constant COIN_TYPE_SEL = 354;      // Same as Polkadot for substrate chains

    // ============ EIP-165 Interface IDs ============
    bytes4 private constant ADDR_INTERFACE_ID = 0x3b3b57de;           // addr(bytes32)
    bytes4 private constant ADDRESS_INTERFACE_ID = 0xf1cb7e06;        // addr(bytes32,uint256)
    bytes4 private constant TEXT_INTERFACE_ID = 0x59d1d43c;           // text(bytes32,string)
    bytes4 private constant CONTENTHASH_INTERFACE_ID = 0xbc1c58d1;    // contenthash(bytes32)
    bytes4 private constant NAME_INTERFACE_ID = 0x691f3431;           // name(bytes32)
    bytes4 private constant MULTICALL_INTERFACE_ID = 0xac9650d8;      // multicall(bytes[])
    bytes4 private constant SUPPORTS_INTERFACE_ID = 0x01ffc9a7;       // supportsInterface(bytes4)
    bytes4 private constant SET_ADDR_INTERFACE_ID = 0xd5fa2b00;       // setAddr(bytes32,address)
    bytes4 private constant SET_ADDR_MULTI_INTERFACE_ID = 0x8b95dd71; // setAddr(bytes32,uint256,bytes)

    // ============ Modifiers ============
    
    modifier authorised(bytes32 node) {
        require(isAuthorised(node), "MultiChainResolver: Not authorised");
        _;
    }

    // ============ Constructor ============
    
    constructor(ISNSRegistry _sns) {
        sns = _sns;
    }

    // ============ Authorization ============
    
    /**
     * @notice Check if msg.sender is authorised to modify records for node
     * @param node The node to check authorization for
     * @return True if authorized
     */
    function isAuthorised(bytes32 node) internal view returns (bool) {
        address nodeOwner = sns.owner(node);
        return nodeOwner == msg.sender || sns.isApprovedForAll(nodeOwner, msg.sender);
    }

    // ============ Address Records (EIP-137 + EIP-2304) ============

    /**
     * @notice Sets the Ethereum address for node (EIP-137 compatible)
     * @dev This is the primary method used by MetaMask and other wallets
     * @param node The node to update
     * @param a The Ethereum address to set
     */
    function setAddr(bytes32 node, address a) external authorised(node) {
        bytes memory addrBytes = addressToBytes(a);
        _addresses[node][COIN_TYPE_ETH] = addrBytes;
        emit AddrChanged(node, a);
        emit AddressChanged(node, COIN_TYPE_ETH, addrBytes);
    }

    /**
     * @notice Sets the address for a specific coin type (EIP-2304)
     * @param node The node to update
     * @param coinType The SLIP-44 coin type
     * @param a The address in binary format (varies by chain)
     */
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external authorised(node) {
        _addresses[node][coinType] = a;
        emit AddressChanged(node, coinType, a);
        
        // Also emit legacy event for ETH
        if (coinType == COIN_TYPE_ETH && a.length == 20) {
            emit AddrChanged(node, bytesToAddress(a));
        }
    }

    /**
     * @notice Returns the Ethereum address for node (EIP-137)
     * @dev This is what MetaMask calls to resolve .sel names
     * @param node The node to query
     * @return The Ethereum address (0x0 if not set)
     */
    function addr(bytes32 node) external view returns (address) {
        bytes memory a = _addresses[node][COIN_TYPE_ETH];
        if (a.length == 0) {
            return address(0);
        }
        return bytesToAddress(a);
    }

    /**
     * @notice Returns the address for a specific coin type (EIP-2304)
     * @param node The node to query
     * @param coinType The SLIP-44 coin type
     * @return The address in binary format (empty if not set)
     */
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        return _addresses[node][coinType];
    }

    // ============ Text Records (EIP-634) ============

    /**
     * @notice Sets a text record for node
     * @param node The node to update
     * @param key The key (e.g., "avatar", "url", "description", "com.twitter", "com.github")
     * @param value The value to set
     */
    function setText(bytes32 node, string calldata key, string calldata value) external authorised(node) {
        _texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    /**
     * @notice Returns the text record for node
     * @param node The node to query
     * @param key The key to query
     * @return The text value (empty string if not set)
     */
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _texts[node][key];
    }

    // ============ Content Hash (EIP-1577) ============

    /**
     * @notice Sets the content hash for node
     * @param node The node to update
     * @param hash The content hash (IPFS CID, Arweave hash, etc.)
     */
    function setContenthash(bytes32 node, bytes calldata hash) external authorised(node) {
        _contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    /**
     * @notice Returns the content hash for node
     * @param node The node to query
     * @return The content hash (empty if not set)
     */
    function contenthash(bytes32 node) external view returns (bytes memory) {
        return _contenthashes[node];
    }

    // ============ Name (Reverse Resolution) ============

    /**
     * @notice Sets the name for reverse resolution
     * @param node The reverse node (addr.reverse namehash)
     * @param newName The name to set (e.g., "alice.sel")
     */
    function setName(bytes32 node, string calldata newName) external authorised(node) {
        _names[node] = newName;
        emit NameChanged(node, newName);
    }

    /**
     * @notice Returns the name for node (used for reverse resolution)
     * @param node The node to query
     * @return The name (empty string if not set)
     */
    function name(bytes32 node) external view returns (string memory) {
        return _names[node];
    }

    // ============ Multicall (Batch Operations) ============

    /**
     * @notice Executes multiple calls in a single transaction
     * @dev Used by apps to set multiple records at once
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "MultiChainResolver: Multicall failed");
            results[i] = result;
        }
        return results;
    }

    // ============ EIP-165 Interface Support ============

    /**
     * @notice Check if this contract supports an interface
     * @dev Required for ENS compatibility - wallets check this before calling
     * @param interfaceId The interface identifier (EIP-165)
     * @return True if supported
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == SUPPORTS_INTERFACE_ID ||      // EIP-165
            interfaceId == ADDR_INTERFACE_ID ||          // addr(bytes32) - EIP-137
            interfaceId == ADDRESS_INTERFACE_ID ||       // addr(bytes32,uint256) - EIP-2304
            interfaceId == TEXT_INTERFACE_ID ||          // text(bytes32,string) - EIP-634
            interfaceId == CONTENTHASH_INTERFACE_ID ||   // contenthash(bytes32) - EIP-1577
            interfaceId == NAME_INTERFACE_ID ||          // name(bytes32)
            interfaceId == MULTICALL_INTERFACE_ID ||     // multicall(bytes[])
            interfaceId == SET_ADDR_INTERFACE_ID ||      // setAddr(bytes32,address)
            interfaceId == SET_ADDR_MULTI_INTERFACE_ID;  // setAddr(bytes32,uint256,bytes)
    }

    // ============ Batch Read Helpers ============

    /**
     * @notice Get addresses for multiple coin types at once
     * @param node The node to query
     * @param coinTypes Array of coin types to query
     * @return addresses Array of addresses in binary format
     */
    function getAddresses(bytes32 node, uint256[] calldata coinTypes) external view returns (bytes[] memory addresses) {
        addresses = new bytes[](coinTypes.length);
        for (uint256 i = 0; i < coinTypes.length; i++) {
            addresses[i] = _addresses[node][coinTypes[i]];
        }
        return addresses;
    }

    /**
     * @notice Get text records for multiple keys at once
     * @param node The node to query
     * @param keys Array of text record keys
     * @return values Array of text record values
     */
    function getTexts(bytes32 node, string[] calldata keys) external view returns (string[] memory values) {
        values = new string[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            values[i] = _texts[node][keys[i]];
        }
        return values;
    }

    // ============ Internal Utilities ============

    function addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    function bytesToAddress(bytes memory b) internal pure returns (address) {
        require(b.length == 20, "Invalid address length");
        address result;
        assembly {
            result := mload(add(b, 20))
        }
        return result;
    }
}
