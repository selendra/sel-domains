// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SNS Interfaces
 * @notice Standard interfaces for SNS contracts
 */

/**
 * @notice Interface for the SNS Registry
 */
interface ISNSRegistry {
    // Events
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // Functions
    function setRecord(bytes32 node, address owner, address resolver, uint64 ttl) external;
    function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external;
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
    function setResolver(bytes32 node, address resolver) external;
    function setOwner(bytes32 node, address owner) external;
    function setTTL(bytes32 node, uint64 ttl) external;
    function setApprovalForAll(address operator, bool approved) external;
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function ttl(bytes32 node) external view returns (uint64);
    function recordExists(bytes32 node) external view returns (bool);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @notice Interface for resolvers supporting address records
 */
interface IAddrResolver {
    event AddrChanged(bytes32 indexed node, address a);
    
    function addr(bytes32 node) external view returns (address payable);
    function setAddr(bytes32 node, address a) external;
}

/**
 * @notice Interface for resolvers supporting multi-coin addresses
 */
interface IAddressResolver {
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress);
    
    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
    function setAddr(bytes32 node, uint256 coinType, bytes calldata a) external;
}

/**
 * @notice Interface for resolvers supporting text records
 */
interface ITextResolver {
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    
    function text(bytes32 node, string calldata key) external view returns (string memory);
    function setText(bytes32 node, string calldata key, string calldata value) external;
}

/**
 * @notice Interface for resolvers supporting content hash
 */
interface IContentHashResolver {
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    
    function contenthash(bytes32 node) external view returns (bytes memory);
    function setContenthash(bytes32 node, bytes calldata hash) external;
}

/**
 * @notice Interface for resolvers supporting ABI records
 */
interface IABIResolver {
    event ABIChanged(bytes32 indexed node, uint256 indexed contentType);
    
    function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory);
    function setABI(bytes32 node, uint256 contentType, bytes calldata data) external;
}

/**
 * @notice Interface for resolvers supporting name records (reverse resolution)
 */
interface INameResolver {
    event NameChanged(bytes32 indexed node, string name);
    
    function name(bytes32 node) external view returns (string memory);
    function setName(bytes32 node, string calldata name) external;
}

/**
 * @notice Interface for reverse registrar
 */
interface IReverseRegistrar {
    function setName(string memory name) external returns (bytes32);
    function setNameForAddr(address addr, address owner, address resolver, string memory name) external returns (bytes32);
    function node(address addr) external pure returns (bytes32);
}

/**
 * @notice Interface for the registrar controller
 */
interface IRegistrarController {
    struct Price {
        uint256 base;
        uint256 premium;
    }
    
    function rentPrice(string calldata name, uint256 duration) external view returns (Price memory);
    function available(string calldata name) external view returns (bool);
    function makeCommitment(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord
    ) external pure returns (bytes32);
    function commit(bytes32 commitment) external;
    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord
    ) external payable;
    function renew(string calldata name, uint256 duration) external payable;
}

/**
 * @notice Interface for the base registrar (ERC721)
 */
interface IBaseRegistrar {
    event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires);
    event NameRenewed(uint256 indexed id, uint256 expires);
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);

    function addController(address controller) external;
    function removeController(address controller) external;
    function available(uint256 id) external view returns (bool);
    function nameExpires(uint256 id) external view returns (uint256);
    function register(uint256 id, address owner, uint256 duration) external returns (uint256);
    function renew(uint256 id, uint256 duration) external returns (uint256);
    function reclaim(uint256 id, address owner) external;
}

/**
 * @notice Interface for price oracle
 */
interface IPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }
    
    function price(string calldata name, uint256 duration) external view returns (uint256 base, uint256 premium);
    function renewalPrice(string calldata name, uint256 duration) external view returns (uint256);
}

/**
 * @notice Coin type constants for multi-chain address resolution
 */
library CoinTypes {
    uint256 constant SELENDRA = 1961;  // Selendra chain ID
    uint256 constant ETH = 60;         // Ethereum mainnet
    uint256 constant BTC = 0;          // Bitcoin
    uint256 constant BNB = 714;        // BNB Chain
    uint256 constant MATIC = 966;      // Polygon
}

/**
 * @notice EIP-165 interface IDs
 */
library InterfaceIds {
    bytes4 constant ADDR_INTERFACE_ID = 0x3b3b57de;
    bytes4 constant ADDRESS_INTERFACE_ID = 0xf1cb7e06;
    bytes4 constant TEXT_INTERFACE_ID = 0x59d1d43c;
    bytes4 constant CONTENTHASH_INTERFACE_ID = 0xbc1c58d1;
    bytes4 constant ABI_INTERFACE_ID = 0x2203ab56;
    bytes4 constant NAME_INTERFACE_ID = 0x691f3431;
}
