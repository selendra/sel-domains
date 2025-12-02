// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ISNSRegistry} from "./SNSRegistry.sol";
import "./interfaces/ISNSErrors.sol";

/**
 * @title SNS Base Registrar
 * @author Selendra Team
 * @notice ERC-721 NFT implementation for .sel domain ownership
 * @dev Each .sel name is represented as an NFT where tokenId = labelhash(name)
 *
 * Key features:
 * - tokenId = keccak256(label), e.g., keccak256("alice") for alice.sel
 * - NFT ownership corresponds to domain ownership
 * - 90-day grace period after expiry for renewals
 * - Transferable and tradeable on NFT marketplaces
 * - Only authorized controllers can register/renew names
 *
 * Example:
 * - "alice.sel" → tokenId = keccak256("alice")
 * - NFT transfer automatically updates registry ownership
 */
contract BaseRegistrar is ERC721, Ownable {
    // The SNS registry
    address public immutable registry;

    // The namehash of the TLD (.sel)
    bytes32 public immutable baseNode;

    // A map of expiry times
    mapping(uint256 => uint256) public expiries;

    // Grace period for renewals after expiry
    uint256 public constant GRACE_PERIOD = 90 days;

    // Authorised controllers
    mapping(address => bool) public controllers;

    // Events
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event NameRegistered(
        uint256 indexed id,
        address indexed owner,
        uint256 expires
    );
    event NameRenewed(uint256 indexed id, uint256 expires);
    event NameReclaimed(uint256 indexed id, address indexed owner);

    // ============ Modifiers ============

    /// @notice Restricts function to authorized controllers
    modifier onlyController() {
        if (!controllers[msg.sender]) {
            revert SNS_NotController(msg.sender);
        }
        _;
    }

    /// @notice Ensures name is not expired (within grace period is OK)
    modifier live(uint256 id) {
        if (expiries[id] + GRACE_PERIOD <= block.timestamp) {
            revert SNS_NameExpired(id, expiries[id]);
        }
        _;
    }

    /**
     * @notice Constructor
     * @param _registry The SNS registry address
     * @param _baseNode The namehash of the TLD (.sel = namehash("sel"))
     */
    constructor(
        address _registry,
        bytes32 _baseNode
    ) ERC721("Selendra Name Service", "SNS") Ownable(msg.sender) {
        registry = _registry;
        baseNode = _baseNode;
    }

    /**
     * @notice Authorise a controller
     * @param controller The controller address
     */
    function addController(address controller) external onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    /**
     * @notice Remove a controller
     * @param controller The controller address
     */
    function removeController(address controller) external onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    /**
     * @notice Set the resolver for the TLD
     * @param resolver The resolver address
     */
    function setResolver(address resolver) external onlyOwner {
        ISNSRegistry(registry).setResolver(baseNode, resolver);
    }

    /**
     * @notice Check if a name is available for registration
     * @param id The labelhash (keccak256 of the name)
     * @return True if available
     */
    function available(uint256 id) public view returns (bool) {
        return expiries[id] + GRACE_PERIOD < block.timestamp;
    }

    /**
     * @notice Get the expiry time of a name
     * @param id The token id (labelhash)
     * @return The expiry timestamp
     */
    function nameExpires(uint256 id) external view returns (uint256) {
        return expiries[id];
    }

    /**
     * @notice Register a new name
     * @dev Only callable by authorized controllers
     * @param id The token id (labelhash of the name)
     * @param owner The address to own the name
     * @param duration The registration duration in seconds
     * @return The expiry timestamp
     */
    function register(
        uint256 id,
        address owner,
        uint256 duration
    ) external onlyController returns (uint256) {
        if (!available(id)) {
            revert SNS_NameNotAvailableById(id);
        }
        
        // Check for overflow
        unchecked {
            if (block.timestamp + duration + GRACE_PERIOD < block.timestamp) {
                revert SNS_DurationOverflow(duration);
            }
        }

        expiries[id] = block.timestamp + duration;

        if (_ownerOf(id) != address(0)) {
            // Name was previously registered and expired
            _burn(id);
        }

        _mint(owner, id);

        // Update the registry
        ISNSRegistry(registry).setSubnodeOwner(baseNode, bytes32(id), owner);

        emit NameRegistered(id, owner, expiries[id]);

        return expiries[id];
    }

    /**
     * @notice Register a name with resolver configuration
     * @dev Only callable by authorized controllers. Uses setSubnodeRecord for atomic operation.
     * @param id The token id (labelhash of the name)
     * @param owner The address to own the name
     * @param duration The registration duration in seconds
     * @param resolver The resolver address to set (address(0) to skip)
     * @return The expiry timestamp
     */
    function registerWithConfig(
        uint256 id,
        address owner,
        uint256 duration,
        address resolver
    ) external onlyController returns (uint256) {
        if (!available(id)) {
            revert SNS_NameNotAvailableById(id);
        }

        expiries[id] = block.timestamp + duration;

        if (_ownerOf(id) != address(0)) {
            _burn(id);
        }

        _mint(owner, id);

        // Use setSubnodeRecord to atomically set owner and resolver
        // This avoids the issue where we lose authority after setting owner
        if (resolver != address(0)) {
            ISNSRegistry(registry).setSubnodeRecord(
                baseNode,
                bytes32(id),
                owner,
                resolver,
                0
            );
        } else {
            ISNSRegistry(registry).setSubnodeOwner(
                baseNode,
                bytes32(id),
                owner
            );
        }

        emit NameRegistered(id, owner, expiries[id]);

        return expiries[id];
    }

    /**
     * @notice Renew a name by extending its registration period
     * @dev Only callable by authorized controllers. Name must not be expired.
     * @param id The token id (labelhash of the name)
     * @param duration Additional duration in seconds to add
     * @return The new expiry timestamp
     */
    function renew(
        uint256 id,
        uint256 duration
    ) external onlyController live(id) returns (uint256) {
        // Check for overflow
        unchecked {
            if (expiries[id] + duration < expiries[id]) {
                revert SNS_DurationOverflow(duration);
            }
        }
        
        expiries[id] += duration;

        emit NameRenewed(id, expiries[id]);

        return expiries[id];
    }

    /**
     * @notice Reclaim ownership of a name in the registry
     * @dev Used if registry ownership becomes out of sync with NFT ownership.
     *      Only the NFT owner or approved operators can call this.
     * @param id The token id (labelhash of the name)
     * @param owner The owner address to set in the registry
     */
    function reclaim(uint256 id, address owner) external live(id) {
        if (!_isApprovedOrOwner(msg.sender, id)) {
            revert SNS_NotApprovedOrOwner(msg.sender, id);
        }
        ISNSRegistry(registry).setSubnodeOwner(baseNode, bytes32(id), owner);
        emit NameReclaimed(id, owner);
    }

    /**
     * @notice Execute multiple calls in a single transaction
     * @dev Useful for batch renewals or reclaims
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        uint256 len = data.length;
        for (uint256 i = 0; i < len; ) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "Multicall failed");
            results[i] = result;
            unchecked { ++i; }
        }
        return results;
    }

    /**
     * @notice Override transfer to update registry
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        // Update registry ownership on transfer (if name hasn't expired)
        if (
            from != address(0) &&
            to != address(0) &&
            expiries[tokenId] > block.timestamp
        ) {
            ISNSRegistry(registry).setSubnodeOwner(
                baseNode,
                bytes32(tokenId),
                to
            );
        }

        return from;
    }

    /**
     * @notice Check approval for token
     */
    function _isApprovedOrOwner(
        address spender,
        uint256 tokenId
    ) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
    }

    /**
     * @notice Returns the token URI for a given token ID
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return
            string(
                abi.encodePacked(
                    "https://sns.selendra.org/api/metadata/",
                    _toString(tokenId)
                )
            );
    }

    /**
     * @notice Convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
