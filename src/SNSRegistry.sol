// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SNS Registry
 * @notice The core registry contract for Selendra Naming Service (.sel domains)
 * @dev Stores ownership and resolver information for all .sel domains
 * 
 * Inspired by ENS (Ethereum Name Service) - adapted for Selendra
 */
interface ISNSRegistry {
    // Events
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // Core functions
    function setRecord(bytes32 node, address owner, address resolver, uint64 ttl) external;
    function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external;
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
    function setResolver(bytes32 node, address resolver) external;
    function setOwner(bytes32 node, address owner) external;
    function setTTL(bytes32 node, uint64 ttl) external;
    function setApprovalForAll(address operator, bool approved) external;
    
    // View functions
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function ttl(bytes32 node) external view returns (uint64);
    function recordExists(bytes32 node) external view returns (bool);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @title SNS Registry Implementation
 */
contract SNSRegistry is ISNSRegistry {
    struct Record {
        address owner;
        address resolver;
        uint64 ttl;
    }

    mapping(bytes32 => Record) private records;
    mapping(address => mapping(address => bool)) private operators;

    // The namehash of the root node (0x0)
    bytes32 constant private ROOT_NODE = bytes32(0);

    modifier authorised(bytes32 node) {
        address nodeOwner = records[node].owner;
        require(
            nodeOwner == msg.sender || operators[nodeOwner][msg.sender],
            "SNS: Not authorised"
        );
        _;
    }

    constructor() {
        records[ROOT_NODE].owner = msg.sender;
    }

    /**
     * @notice Sets the record for a node
     * @param node The node to update
     * @param _owner The address of the new owner
     * @param _resolver The address of the resolver
     * @param _ttl The TTL in seconds
     */
    function setRecord(
        bytes32 node,
        address _owner,
        address _resolver,
        uint64 _ttl
    ) external virtual override authorised(node) {
        _setOwner(node, _owner);
        _setResolverAndTTL(node, _resolver, _ttl);
    }

    /**
     * @notice Sets the record for a subnode
     * @param node The parent node
     * @param label The hash of the label specifying the subnode
     * @param _owner The address of the new owner
     * @param _resolver The address of the resolver
     * @param _ttl The TTL in seconds
     */
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address _owner,
        address _resolver,
        uint64 _ttl
    ) external virtual override authorised(node) {
        bytes32 subnode = _setSubnodeOwner(node, label, _owner);
        _setResolverAndTTL(subnode, _resolver, _ttl);
    }

    /**
     * @notice Transfers ownership of a subnode to a new address
     * @param node The parent node
     * @param label The hash of the label specifying the subnode
     * @param _owner The address of the new owner
     * @return The namehash of the subnode
     */
    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address _owner
    ) public virtual override authorised(node) returns (bytes32) {
        return _setSubnodeOwner(node, label, _owner);
    }

    /**
     * @notice Sets the resolver address for the specified node
     * @param node The node to update
     * @param _resolver The address of the resolver
     */
    function setResolver(bytes32 node, address _resolver) public virtual override authorised(node) {
        emit NewResolver(node, _resolver);
        records[node].resolver = _resolver;
    }

    /**
     * @notice Transfers ownership of a node to a new address
     * @param node The node to transfer ownership of
     * @param _owner The address of the new owner
     */
    function setOwner(bytes32 node, address _owner) public virtual override authorised(node) {
        _setOwner(node, _owner);
    }

    /**
     * @notice Sets the TTL for the specified node
     * @param node The node to update
     * @param _ttl The TTL in seconds
     */
    function setTTL(bytes32 node, uint64 _ttl) public virtual override authorised(node) {
        emit NewTTL(node, _ttl);
        records[node].ttl = _ttl;
    }

    /**
     * @notice Enable or disable approval for a third party ("operator") to manage all of msg.sender's records
     * @param operator Address to add to the set of authorized operators
     * @param approved True if the operator is approved, false to revoke approval
     */
    function setApprovalForAll(address operator, bool approved) external virtual override {
        operators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @notice Returns the address that owns the specified node
     * @param node The specified node
     * @return Address of the owner
     */
    function owner(bytes32 node) public view virtual override returns (address) {
        address addr = records[node].owner;
        if (addr == address(this)) {
            return address(0);
        }
        return addr;
    }

    /**
     * @notice Returns the address of the resolver for the specified node
     * @param node The specified node
     * @return Address of the resolver
     */
    function resolver(bytes32 node) public view virtual override returns (address) {
        return records[node].resolver;
    }

    /**
     * @notice Returns the TTL of a node
     * @param node The specified node
     * @return TTL of the node
     */
    function ttl(bytes32 node) public view virtual override returns (uint64) {
        return records[node].ttl;
    }

    /**
     * @notice Returns whether a record has been set for a node
     * @param node The specified node
     * @return True if a record exists
     */
    function recordExists(bytes32 node) public view virtual override returns (bool) {
        return records[node].owner != address(0);
    }

    /**
     * @notice Query if an address is an authorized operator for another address
     * @param _owner The address that owns the records
     * @param operator The address that acts on behalf of the owner
     * @return True if operator is approved
     */
    function isApprovedForAll(
        address _owner,
        address operator
    ) external view virtual override returns (bool) {
        return operators[_owner][operator];
    }

    // Internal functions

    function _setOwner(bytes32 node, address _owner) internal virtual {
        emit Transfer(node, _owner);
        records[node].owner = _owner;
    }

    function _setResolverAndTTL(bytes32 node, address _resolver, uint64 _ttl) internal {
        if (_resolver != records[node].resolver) {
            records[node].resolver = _resolver;
            emit NewResolver(node, _resolver);
        }
        if (_ttl != records[node].ttl) {
            records[node].ttl = _ttl;
            emit NewTTL(node, _ttl);
        }
    }

    function _setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address _owner
    ) internal virtual returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        emit NewOwner(node, label, _owner);
        records[subnode].owner = _owner;
        return subnode;
    }
}
