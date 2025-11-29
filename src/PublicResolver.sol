// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISNSRegistry} from "./SNSRegistry.sol";

/**
 * @title Public Resolver for SNS
 * @notice Stores various records for .sel domains
 * @dev Supports address, text, content hash, and custom records
 */
contract PublicResolver {
    ISNSRegistry public immutable sns;

    // Address records: node => coinType => address
    // coinType 60 = EVM, coinType 354 = Selendra native (SLIP-44)
    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;

    // Text records: node => key => value
    mapping(bytes32 => mapping(string => string)) private _texts;

    // Content hash: node => hash
    mapping(bytes32 => bytes) private _contenthashes;

    // Name record (for reverse resolution): node => name
    mapping(bytes32 => string) private _names;

    // Events
    event AddrChanged(bytes32 indexed node, address addr);
    event AddressChanged(
        bytes32 indexed node,
        uint256 coinType,
        bytes newAddress
    );
    event TextChanged(
        bytes32 indexed node,
        string indexed indexedKey,
        string key,
        string value
    );
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    event NameChanged(bytes32 indexed node, string name);

    // EVM coin type (SLIP-44)
    uint256 private constant COIN_TYPE_ETH = 60;

    // Selendra coin type (using same as Polkadot ecosystem convention)
    uint256 private constant COIN_TYPE_SEL = 354;

    modifier authorised(bytes32 node) {
        require(isAuthorised(node), "PublicResolver: Not authorised");
        _;
    }

    constructor(ISNSRegistry _sns) {
        sns = _sns;
    }

    /**
     * @notice Check if msg.sender is authorised to modify records for node
     */
    function isAuthorised(bytes32 node) internal view returns (bool) {
        address nodeOwner = sns.owner(node);
        return
            nodeOwner == msg.sender ||
            sns.isApprovedForAll(nodeOwner, msg.sender);
    }

    // ============ Address Records ============

    /**
     * @notice Sets the EVM address for node
     * @param node The node to update
     * @param a The EVM address to set
     */
    function setAddr(bytes32 node, address a) external authorised(node) {
        _addresses[node][COIN_TYPE_ETH] = addressToBytes(a);
        emit AddrChanged(node, a);
        emit AddressChanged(node, COIN_TYPE_ETH, addressToBytes(a));
    }

    /**
     * @notice Sets the address for a specific coin type
     * @param node The node to update
     * @param coinType The SLIP-44 coin type
     * @param a The address in bytes
     */
    function setAddr(
        bytes32 node,
        uint256 coinType,
        bytes memory a
    ) external authorised(node) {
        _addresses[node][coinType] = a;
        emit AddressChanged(node, coinType, a);

        if (coinType == COIN_TYPE_ETH) {
            emit AddrChanged(node, bytesToAddress(a));
        }
    }

    /**
     * @notice Returns the EVM address for node
     * @param node The node to query
     * @return The EVM address
     */
    function addr(bytes32 node) external view returns (address) {
        bytes memory addrBytes = _addresses[node][COIN_TYPE_ETH];
        if (addrBytes.length == 0) {
            return address(0);
        }
        return bytesToAddress(addrBytes);
    }

    /**
     * @notice Returns the address for a specific coin type
     * @param node The node to query
     * @param coinType The SLIP-44 coin type
     * @return The address in bytes
     */
    function addr(
        bytes32 node,
        uint256 coinType
    ) external view returns (bytes memory) {
        return _addresses[node][coinType];
    }

    // ============ Text Records ============

    /**
     * @notice Sets a text record for node
     * @param node The node to update
     * @param key The key to set (e.g., "avatar", "url", "com.twitter")
     * @param value The value to set
     */
    function setText(
        bytes32 node,
        string calldata key,
        string calldata value
    ) external authorised(node) {
        _texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    /**
     * @notice Returns the text record for node
     * @param node The node to query
     * @param key The key to query
     * @return The text value
     */
    function text(
        bytes32 node,
        string calldata key
    ) external view returns (string memory) {
        return _texts[node][key];
    }

    // ============ Content Hash ============

    /**
     * @notice Sets the content hash for node
     * @param node The node to update
     * @param hash The content hash (IPFS, Arweave, etc.)
     */
    function setContenthash(
        bytes32 node,
        bytes calldata hash
    ) external authorised(node) {
        _contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    /**
     * @notice Returns the content hash for node
     * @param node The node to query
     * @return The content hash
     */
    function contenthash(bytes32 node) external view returns (bytes memory) {
        return _contenthashes[node];
    }

    // ============ Name (Reverse Resolution) ============

    /**
     * @notice Sets the name for reverse resolution
     * @param node The node to update
     * @param newName The name to set
     */
    function setName(
        bytes32 node,
        string calldata newName
    ) external authorised(node) {
        _names[node] = newName;
        emit NameChanged(node, newName);
    }

    /**
     * @notice Returns the name for node
     * @param node The node to query
     * @return The name
     */
    function name(bytes32 node) external view returns (string memory) {
        return _names[node];
    }

    // ============ Multicall ============

    /**
     * @notice Executes multiple calls in a single transaction
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(
        bytes[] calldata data
    ) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                data[i]
            );
            require(success, "PublicResolver: Multicall failed");
            results[i] = result;
        }
        return results;
    }

    // ============ Interface Support ============

    /**
     * @notice Check if this contract supports an interface
     * @param interfaceId The interface identifier
     * @return True if supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) external pure returns (bool) {
        return
            interfaceId == 0x3b3b57de || // addr(bytes32)
            interfaceId == 0xf1cb7e06 || // addr(bytes32,uint256)
            interfaceId == 0x59d1d43c || // text(bytes32,string)
            interfaceId == 0xbc1c58d1 || // contenthash(bytes32)
            interfaceId == 0x691f3431 || // name(bytes32)
            interfaceId == 0x01ffc9a7; // supportsInterface(bytes4)
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
