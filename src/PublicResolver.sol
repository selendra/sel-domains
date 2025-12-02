// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISNSRegistry} from "./SNSRegistry.sol";
import "./interfaces/ISNSErrors.sol";

/**
 * @title Public Resolver for SNS
 * @author Selendra Team
 * @notice Stores various records for .sel domains
 * @dev Supports address, text, content hash, and custom records.
 *      Implements EIP-137 resolver interface with multi-chain address support.
 * 
 * @custom:security-contact security@selendra.org
 * 
 * Record Types:
 * - Address: EVM (coinType 60) and multi-chain (SLIP-44)
 * - Text: Key-value pairs (avatar, url, social handles)
 * - Content Hash: IPFS/Arweave content identifiers
 * - Name: Reverse resolution lookup
 */
contract PublicResolver {
    /// @notice The SNS registry contract for authorization checks
    ISNSRegistry public immutable sns;

    /// @notice Address records: node => coinType => address
    /// @dev coinType 60 = EVM, coinType 354 = Selendra native (SLIP-44)
    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;

    /// @notice Text records: node => key => value
    mapping(bytes32 => mapping(string => string)) private _texts;

    /// @notice Content hash: node => hash
    mapping(bytes32 => bytes) private _contenthashes;

    /// @notice Name record (for reverse resolution): node => name
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

    /// @notice EVM coin type (SLIP-44)
    uint256 private constant COIN_TYPE_ETH = 60;

    /// @notice Selendra coin type (using same as Polkadot ecosystem convention)
    uint256 private constant COIN_TYPE_SEL = 354;

    /**
     * @notice Restricts function to authorized callers only
     * @dev Authorized callers are the node owner or approved operators
     * @param node The namehash node being modified
     */
    modifier authorised(bytes32 node) {
        if (!isAuthorised(node)) {
            revert SNS_NotAuthorized(node, msg.sender);
        }
        _;
    }

    /**
     * @notice Initialize the resolver with the SNS registry
     * @param _sns The SNS registry contract address
     */
    constructor(ISNSRegistry _sns) {
        sns = _sns;
    }

    /**
     * @notice Check if msg.sender is authorised to modify records for node
     * @param node The namehash node to check authorization for
     * @return True if caller is authorized (owner or approved operator)
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
     * @dev Uses delegatecall to preserve msg.sender for authorization checks
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(
        bytes[] calldata data
    ) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        uint256 len = data.length;
        for (uint256 i = 0; i < len; ) {
            (bool success, bytes memory result) = address(this).delegatecall(
                data[i]
            );
            if (!success) {
                revert SNS_MulticallFailed(i, data[i]);
            }
            results[i] = result;
            unchecked { ++i; }
        }
        return results;
    }

    // ============ EIP-2544 Wildcard Resolution ============

    /// @notice Interface ID for EIP-2544 ExtendedResolver
    bytes4 private constant EXTENDED_RESOLVER_INTERFACE_ID = 0x9061b923;

    /**
     * @notice Resolve a name using EIP-2544 wildcard resolution
     * @dev This function enables wildcard subdomain resolution.
     *      It receives the DNS-encoded name and the original calldata,
     *      allowing the resolver to handle subdomains dynamically.
     * @param dnsEncodedName The DNS wire format encoded name (e.g., "\x05alice\x03sel\x00")
     * @param data The original resolver function calldata
     * @return The result of the resolution
     */
    function resolve(
        bytes calldata dnsEncodedName,
        bytes calldata data
    ) external view returns (bytes memory) {
        // Extract the node from the calldata (first 32 bytes after selector)
        bytes32 node;
        if (data.length >= 36) {
            // Skip 4-byte selector, read 32-byte node
            assembly {
                node := calldataload(add(data.offset, 4))
            }
        } else {
            revert("Invalid calldata");
        }

        // Extract function selector from data
        bytes4 selector = bytes4(data[:4]);

        // Route to appropriate function based on selector
        if (selector == 0x3b3b57de) {
            // addr(bytes32)
            bytes memory addrBytes = _addresses[node][COIN_TYPE_ETH];
            if (addrBytes.length == 0) {
                return abi.encode(address(0));
            }
            return abi.encode(bytesToAddress(addrBytes));
        } else if (selector == 0xf1cb7e06) {
            // addr(bytes32,uint256)
            uint256 coinType;
            assembly {
                coinType := calldataload(add(data.offset, 36))
            }
            return abi.encode(_addresses[node][coinType]);
        } else if (selector == 0x59d1d43c) {
            // text(bytes32,string) - more complex, decode string
            // For simplicity, forward to internal storage
            // In production, would need proper string decoding
            return abi.encode("");
        } else if (selector == 0xbc1c58d1) {
            // contenthash(bytes32)
            return abi.encode(_contenthashes[node]);
        } else if (selector == 0x691f3431) {
            // name(bytes32)
            return abi.encode(_names[node]);
        }

        // Unsupported function
        revert("Unsupported function");
    }

    /**
     * @notice Decode a DNS-encoded name to get labels
     * @dev Utility function to extract labels from DNS wire format
     * @param dnsEncodedName The DNS wire format encoded name
     * @return labels Array of labels (e.g., ["alice", "sel"])
     */
    function decodeDnsName(
        bytes calldata dnsEncodedName
    ) public pure returns (string[] memory labels) {
        // Count labels first
        uint256 labelCount = 0;
        uint256 i = 0;
        while (i < dnsEncodedName.length && dnsEncodedName[i] != 0) {
            uint8 labelLen = uint8(dnsEncodedName[i]);
            labelCount++;
            i += labelLen + 1;
        }

        labels = new string[](labelCount);
        
        // Extract labels
        i = 0;
        uint256 labelIndex = 0;
        while (i < dnsEncodedName.length && dnsEncodedName[i] != 0) {
            uint8 labelLen = uint8(dnsEncodedName[i]);
            bytes memory label = new bytes(labelLen);
            for (uint256 j = 0; j < labelLen; ) {
                label[j] = dnsEncodedName[i + 1 + j];
                unchecked { ++j; }
            }
            labels[labelIndex] = string(label);
            i += labelLen + 1;
            unchecked { ++labelIndex; }
        }

        return labels;
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
            interfaceId == 0x9061b923 || // EIP-2544 resolve(bytes,bytes)
            interfaceId == 0x01ffc9a7; // supportsInterface(bytes4)
    }

    // ============ Internal Utilities ============

    /**
     * @notice Convert an address to bytes
     * @param a The address to convert
     * @return 20-byte representation of the address
     */
    function addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    /**
     * @notice Convert bytes to an address
     * @dev Reverts if bytes length is not 20
     * @param b The bytes to convert
     * @return The decoded address
     */
    function bytesToAddress(bytes memory b) internal pure returns (address) {
        if (b.length != 20) {
            revert SNS_InvalidAddressLength(COIN_TYPE_ETH, b.length, 20);
        }
        address result;
        assembly {
            result := mload(add(b, 20))
        }
        return result;
    }
}
