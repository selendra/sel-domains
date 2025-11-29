// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SNSRegistry.sol";
import "./BaseRegistrar.sol";

/**
 * @title SEL Registrar Controller
 * @notice Handles .sel domain registration with commit-reveal scheme
 * @dev Prevents front-running by requiring a commit before registration
 */
contract SELRegistrarController {
    ISNSRegistry public immutable sns;
    BaseRegistrar public immutable baseRegistrar;

    // Price oracle for dynamic pricing
    IPriceOracle public priceOracle;

    // Commitment storage: commitment hash => timestamp
    mapping(bytes32 => uint256) public commitments;

    // Minimum and maximum commitment age (prevents front-running)
    uint256 public constant MIN_COMMITMENT_AGE = 60; // 1 minute
    uint256 public constant MAX_COMMITMENT_AGE = 86400; // 24 hours

    // Minimum registration duration
    uint256 public constant MIN_REGISTRATION_DURATION = 31536000; // 1 year

    // The namehash of .sel (keccak256("sel"))
    bytes32 public constant SEL_NODE =
        0x6e5e8a6db7e0f8f8c9c4e5d6b7a8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6;

    // Events
    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 cost,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );
    event Commit(bytes32 indexed commitment);

    constructor(
        ISNSRegistry _sns,
        BaseRegistrar _baseRegistrar,
        IPriceOracle _priceOracle
    ) {
        sns = _sns;
        baseRegistrar = _baseRegistrar;
        priceOracle = _priceOracle;
    }

    /**
     * @notice Check if a name is valid (meets length requirements)
     * @param name The name to check (without .sel)
     * @return True if valid
     */
    function valid(string memory name) public pure returns (bool) {
        bytes memory nameBytes = bytes(name);
        // Minimum 3 characters
        if (nameBytes.length < 3) return false;
        // Maximum 63 characters (DNS label limit)
        if (nameBytes.length > 63) return false;
        // Only alphanumeric and hyphens, no leading/trailing hyphens
        for (uint256 i = 0; i < nameBytes.length; i++) {
            bytes1 char = nameBytes[i];
            bool isLowerAlpha = (char >= 0x61 && char <= 0x7A); // a-z
            bool isDigit = (char >= 0x30 && char <= 0x39); // 0-9
            bool isHyphen = (char == 0x2D); // -
            if (!isLowerAlpha && !isDigit && !isHyphen) return false;
            // No leading or trailing hyphens
            if (isHyphen && (i == 0 || i == nameBytes.length - 1)) return false;
        }
        return true;
    }

    /**
     * @notice Check if a name is available for registration
     * @param name The name to check (without .sel)
     * @return True if available
     */
    function available(string memory name) public view returns (bool) {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        return valid(name) && baseRegistrar.available(tokenId);
    }

    /**
     * @notice Get the price for registering a name
     * @param name The name to register (without .sel)
     * @param duration Registration duration in seconds
     * @return base Base price
     * @return premium Premium price (for short/desirable names)
     */
    function rentPrice(
        string memory name,
        uint256 duration
    ) public view returns (uint256 base, uint256 premium) {
        return priceOracle.price(name, duration);
    }

    /**
     * @notice Create a commitment hash for registration
     * @param name The name to register (without .sel)
     * @param owner The address that will own the name
     * @param duration Registration duration in seconds
     * @param secret A secret to prevent front-running
     * @param resolver The resolver address to set
     * @param data Additional resolver data
     * @param reverseRecord Whether to set up reverse resolution
     * @return The commitment hash
     */
    function makeCommitment(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    name,
                    owner,
                    duration,
                    secret,
                    resolver,
                    data,
                    reverseRecord
                )
            );
    }

    /**
     * @notice Submit a commitment to register a name
     * @param commitment The commitment hash from makeCommitment
     */
    function commit(bytes32 commitment) external {
        require(commitments[commitment] == 0, "Commitment already exists");
        commitments[commitment] = block.timestamp;
        emit Commit(commitment);
    }

    /**
     * @notice Register a name after committing
     * @param name The name to register (without .sel)
     * @param owner The address that will own the name
     * @param duration Registration duration in seconds
     * @param secret The same secret used in makeCommitment
     * @param resolver The resolver address to set
     * @param data Additional resolver data
     * @param reverseRecord Whether to set up reverse resolution
     */
    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord
    ) external payable {
        bytes32 commitment = makeCommitment(
            name,
            owner,
            duration,
            secret,
            resolver,
            data,
            reverseRecord
        );

        // Verify commitment
        uint256 commitTime = commitments[commitment];
        require(commitTime > 0, "No commitment found");
        require(
            block.timestamp >= commitTime + MIN_COMMITMENT_AGE,
            "Commitment too new"
        );
        require(
            block.timestamp <= commitTime + MAX_COMMITMENT_AGE,
            "Commitment expired"
        );

        // Delete commitment to prevent replay
        delete commitments[commitment];

        // Validate name
        require(available(name), "Name not available");
        require(duration >= MIN_REGISTRATION_DURATION, "Duration too short");

        // Calculate price
        (uint256 base, uint256 premium) = rentPrice(name, duration);
        uint256 price = base + premium;
        require(msg.value >= price, "Insufficient payment");

        // Register the name via BaseRegistrar
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        uint256 expires;

        // Register through BaseRegistrar which handles registry updates
        if (resolver != address(0)) {
            expires = baseRegistrar.registerWithConfig(
                tokenId,
                owner,
                duration,
                resolver
            );
        } else {
            expires = baseRegistrar.register(tokenId, owner, duration);
        }

        // Set resolver records if data provided
        if (resolver != address(0) && data.length > 0) {
            bytes32 node = keccak256(
                abi.encodePacked(baseRegistrar.baseNode(), label)
            );
            _setRecords(resolver, node, data);
        }

        // Set up reverse record if requested
        if (reverseRecord) {
            _setReverseRecord(name, owner);
        }

        emit NameRegistered(name, label, owner, price, expires);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }

    /**
     * @notice Renew a name registration
     * @param name The name to renew (without .sel)
     * @param duration Additional duration in seconds
     */
    function renew(string calldata name, uint256 duration) external payable {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        require(!baseRegistrar.available(tokenId), "Name not registered");

        (uint256 basePrice, ) = rentPrice(name, duration);
        require(msg.value >= basePrice, "Insufficient payment");

        // Renew through BaseRegistrar
        uint256 newExpires = baseRegistrar.renew(tokenId, duration);

        emit NameRenewed(name, label, basePrice, newExpires);

        // Refund excess
        if (msg.value > basePrice) {
            payable(msg.sender).transfer(msg.value - basePrice);
        }
    }

    /**
     * @notice Withdraw collected fees
     * @param to Address to send fees to
     */
    function withdraw(address payable to) external {
        // In production: require governance/owner permission
        to.transfer(address(this).balance);
    }

    // Internal functions

    function _setRecords(
        address resolverAddr,
        bytes32 /* node */,
        bytes[] calldata data
    ) internal {
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, ) = resolverAddr.call(data[i]);
            require(success, "Record setting failed");
        }
    }

    function _setReverseRecord(string memory name, address owner) internal {
        // In production: interact with ReverseRegistrar
        // For now: placeholder
    }
}

/**
 * @title Price Oracle Interface
 */
interface IPriceOracle {
    function price(
        string memory name,
        uint256 duration
    ) external view returns (uint256 base, uint256 premium);
}

/**
 * @title Simple Price Oracle
 * @notice Basic pricing based on name length
 */
contract SimplePriceOracle is IPriceOracle {
    // Prices in SEL (with 18 decimals)
    uint256 public constant PRICE_3_CHAR = 100 ether; // 100 SEL per year
    uint256 public constant PRICE_4_CHAR = 50 ether; // 50 SEL per year
    uint256 public constant PRICE_5_PLUS = 10 ether; // 10 SEL per year

    uint256 constant SECONDS_PER_YEAR = 31536000;

    /**
     * @notice Calculate the price for a name
     * @param name The name (without .sel)
     * @param duration Duration in seconds
     * @return base Base price
     * @return premium Premium (0 for now)
     */
    function price(
        string memory name,
        uint256 duration
    ) external pure override returns (uint256 base, uint256 premium) {
        uint256 len = bytes(name).length;
        uint256 annualPrice;

        if (len == 3) {
            annualPrice = PRICE_3_CHAR;
        } else if (len == 4) {
            annualPrice = PRICE_4_CHAR;
        } else {
            annualPrice = PRICE_5_PLUS;
        }

        base = (annualPrice * duration) / SECONDS_PER_YEAR;
        premium = 0; // Could add premium for desirable names

        return (base, premium);
    }
}
