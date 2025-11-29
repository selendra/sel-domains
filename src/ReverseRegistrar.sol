// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISNSRegistry} from "./SNSRegistry.sol";

/**
 * @title Reverse Registrar for SNS
 * @notice Manages reverse resolution (address → name)
 * @dev Allows users to set their primary .sel name
 */
contract ReverseRegistrar {
    ISNSRegistry public immutable sns;
    address public immutable resolver;

    // The namehash of addr.reverse
    // namehash("addr.reverse") = keccak256(keccak256(0x0, keccak256("reverse")), keccak256("addr"))
    bytes32 public constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    event ReverseClaimed(address indexed addr, bytes32 indexed node);

    constructor(ISNSRegistry _sns, address _resolver) {
        sns = _sns;
        resolver = _resolver;
    }

    /**
     * @notice Set the primary name for msg.sender
     * @param name The name to set (e.g., "alice.sel")
     * @return The namehash of the reverse record
     */
    function setName(string memory name) public returns (bytes32) {
        return setNameForAddr(msg.sender, msg.sender, resolver, name);
    }

    /**
     * @notice Set the primary name for an address
     * @param addr The address to set the name for
     * @param owner The owner of the reverse record
     * @param resolverAddr The resolver to use
     * @param name The name to set
     * @return The namehash of the reverse record
     */
    function setNameForAddr(
        address addr,
        address owner,
        address resolverAddr,
        string memory name
    ) public returns (bytes32) {
        require(
            addr == msg.sender || sns.isApprovedForAll(addr, msg.sender),
            "ReverseRegistrar: Not authorised"
        );

        bytes32 reverseNode = _claimForAddr(addr, owner, resolverAddr);

        // Set the name in the resolver
        INameResolver(resolverAddr).setName(reverseNode, name);

        return reverseNode;
    }

    /**
     * @notice Claim the reverse record for an address
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
        require(
            addr == msg.sender || sns.isApprovedForAll(addr, msg.sender),
            "ReverseRegistrar: Not authorised"
        );

        return _claimForAddr(addr, owner, resolverAddr);
    }

    /**
     * @notice Get the reverse node for an address
     * @param addr The address to get the node for
     * @return The namehash of the reverse record
     */
    function node(address addr) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr))
            );
    }

    // Internal functions

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
     * @param addr The address to convert
     * @return The keccak256 hash of the lowercase hex string
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

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}

interface INameResolver {
    function setName(bytes32 node, string memory name) external;
}
