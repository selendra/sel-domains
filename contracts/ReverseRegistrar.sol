// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISNSRegistry} from "./SNSRegistry.sol";
import "./interfaces/ISNSErrors.sol";

/**
 * @title Reverse Registrar for SNS
 * @author Selendra Team
 * @notice Manages reverse resolution (address → name)
 * @dev Allows users to set their primary .sel name for display purposes.
 *      Uses the addr.reverse namespace following ENS convention.
 * 
 * @custom:security-contact security@selendra.org
 * 
 * Reverse Resolution:
 * - Enables displaying "alice.sel" instead of "0x123..."
 * - Each address can claim one reverse record
 * - Record stored under: namehash(sha3HexAddress(addr) + ".addr.reverse")
 */
contract ReverseRegistrar {
    /// @notice The SNS registry contract
    ISNSRegistry public immutable sns;
    
    /// @notice The default resolver for reverse records
    address public immutable resolver;

    /// @notice The namehash of addr.reverse
    /// @dev namehash("addr.reverse") = keccak256(keccak256(0x0, keccak256("reverse")), keccak256("addr"))
    bytes32 public constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    /// @notice Emitted when a reverse record is claimed
    /// @param addr The address that claimed the record
    /// @param node The namehash of the reverse record
    event ReverseClaimed(address indexed addr, bytes32 indexed node);

    /**
     * @notice Initialize the reverse registrar
     * @param _sns The SNS registry contract address
     * @param _resolver The default resolver for reverse records
     */
    constructor(ISNSRegistry _sns, address _resolver) {
        sns = _sns;
        resolver = _resolver;
    }

    /**
     * @notice Set the primary name for msg.sender
     * @dev Convenience function that uses msg.sender as both addr and owner
     * @param name The name to set (e.g., "alice.sel")
     * @return The namehash of the reverse record
     */
    function setName(string memory name) public returns (bytes32) {
        return setNameForAddr(msg.sender, msg.sender, resolver, name);
    }

    /**
     * @notice Set the primary name for an address
     * @dev Only the address owner or an approved operator can set the name
     * @param addr The address to set the name for
     * @param owner The owner of the reverse record
     * @param resolverAddr The resolver to use
     * @param name The name to set (e.g., "alice.sel")
     * @return The namehash of the reverse record
     */
    function setNameForAddr(
        address addr,
        address owner,
        address resolverAddr,
        string memory name
    ) public returns (bytes32) {
        if (addr != msg.sender && !sns.isApprovedForAll(addr, msg.sender)) {
            revert SNS_CannotClaimReverse(addr, msg.sender);
        }

        bytes32 reverseNode = _claimForAddr(addr, owner, resolverAddr);

        // Set the name in the resolver
        INameResolver(resolverAddr).setName(reverseNode, name);

        return reverseNode;
    }

    /**
     * @notice Claim the reverse record for an address
     * @dev Claims the record without setting a name. Useful for initial setup.
     * @param addr The address to claim for
     * @param owner The owner of the reverse record
     * @param resolverAddr The resolver to use
     * @return The namehash of the reverse record
     */
    function claim(
        address addr,
        address owner,
        address resolverAddr
    ) public returns (bytes32) {
        if (addr != msg.sender && !sns.isApprovedForAll(addr, msg.sender)) {
            revert SNS_CannotClaimReverse(addr, msg.sender);
        }

        return _claimForAddr(addr, owner, resolverAddr);
    }

    /**
     * @notice Get the reverse node for an address
     * @dev Calculates: keccak256(ADDR_REVERSE_NODE, sha3HexAddress(addr))
     * @param addr The address to get the node for
     * @return The namehash of the reverse record
     */
    function node(address addr) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr))
            );
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to claim a reverse record
     * @param addr The address to claim for
     * @param owner The owner of the reverse record
     * @param resolverAddr The resolver to use
     * @return The namehash of the reverse record
     */
    function _claimForAddr(
        address addr,
        address owner,
        address resolverAddr
    ) internal returns (bytes32) {
        bytes32 label = sha3HexAddress(addr);
        bytes32 reverseNode = keccak256(
            abi.encodePacked(ADDR_REVERSE_NODE, label)
        );

        // Set the subnode owner
        sns.setSubnodeRecord(ADDR_REVERSE_NODE, label, owner, resolverAddr, 0);

        emit ReverseClaimed(addr, reverseNode);

        return reverseNode;
    }

    /**
     * @notice Convert address to lowercase hex string hash
     * @dev Converts each nibble to lowercase hex character, then hashes
     * @param addr The address to convert
     * @return The keccak256 hash of the lowercase hex string (without 0x prefix)
     */
    function sha3HexAddress(address addr) internal pure returns (bytes32) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(
                uint8(uint256(uint160(addr)) / (2 ** (8 * (19 - i))))
            );
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return keccak256(s);
    }

    /**
     * @notice Convert nibble to hex character
     * @param b The nibble (0-15)
     * @return c The hex character ('0'-'9' or 'a'-'f')
     */
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // ============ Multicall ============

    /**
     * @notice Execute multiple calls in a single transaction
     * @dev Useful for batch reverse record operations
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        uint256 len = data.length;
        for (uint256 i = 0; i < len; ) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            if (!success) {
                revert SNS_MulticallFailed(i, data[i]);
            }
            results[i] = result;
            unchecked { ++i; }
        }
        return results;
    }
}

/**
 * @title Name Resolver Interface
 * @notice Interface for resolvers that support the name() function
 */
interface INameResolver {
    function setName(bytes32 node, string memory name) external;
}
