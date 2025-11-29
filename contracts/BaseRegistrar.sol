// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SNSRegistry.sol";

/**
 * @title SNS Base Registrar
 * @notice ERC-721 NFT implementation for .sel domain ownership
 * @dev Each .sel name is represented as an NFT where tokenId = labelhash(name)
 *
 * Example:
 * - "alice.sel" → tokenId = keccak256("alice")
 * - NFT ownership = domain ownership
 * - Transferable and tradeable on NFT marketplaces
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

    // Modifiers
    modifier onlyController() {
        require(controllers[msg.sender], "Not a controller");
        _;
    }

    modifier live(uint256 id) {
        require(expiries[id] + GRACE_PERIOD > block.timestamp, "Name expired");
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
     * @param id The token id (labelhash)
     * @param owner The owner address
     * @param duration The registration duration in seconds
     * @return The expiry timestamp
     */
    function register(
        uint256 id,
        address owner,
        uint256 duration
    ) external onlyController returns (uint256) {
        require(available(id), "Name not available");
        require(
            block.timestamp + duration + GRACE_PERIOD > block.timestamp,
            "Duration too long"
        );

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
     * @notice Register a name with records
     * @param id The token id (labelhash)
     * @param owner The owner address
     * @param duration The registration duration
     * @param resolver The resolver address
     * @return The expiry timestamp
     */
    function registerWithConfig(
        uint256 id,
        address owner,
        uint256 duration,
        address resolver
    ) external onlyController returns (uint256) {
        require(available(id), "Name not available");

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
     * @notice Renew a name
     * @param id The token id (labelhash)
     * @param duration Additional duration in seconds
     * @return The new expiry timestamp
     */
    function renew(
        uint256 id,
        uint256 duration
    ) external onlyController live(id) returns (uint256) {
        expiries[id] += duration;

        emit NameRenewed(id, expiries[id]);

        return expiries[id];
    }

    /**
     * @notice Reclaim ownership of a name in the registry
     * @dev Used if registry ownership becomes out of sync with NFT ownership
     * @param id The token id
     * @param owner The owner to set
     */
    function reclaim(uint256 id, address owner) external live(id) {
        require(_isApprovedOrOwner(msg.sender, id), "Not approved");
        ISNSRegistry(registry).setSubnodeOwner(baseNode, bytes32(id), owner);
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
