// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISNSRegistry} from "./SNSRegistry.sol";
import {BaseRegistrar} from "./BaseRegistrar.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISNSErrors.sol";

/**
 * @title SEL Registrar Controller
 * @author Selendra Team
 * @notice Handles .sel domain registration with commit-reveal scheme
 * @dev Prevents front-running by requiring a commit before registration.
 *      Flow: makeCommitment() → commit() → wait MIN_COMMITMENT_AGE → register()
 * 
 * @custom:security-contact security@selendra.org
 * @custom:deployment-note Must be added as controller on BaseRegistrar after deployment
 */
contract SELRegistrarController is Ownable {
    /// @notice The SNS registry contract
    ISNSRegistry public immutable sns;
    
    /// @notice The base registrar that handles NFT ownership
    BaseRegistrar public immutable baseRegistrar;

    /// @notice Price oracle for dynamic pricing
    IPriceOracle public priceOracle;

    /// @notice Commitment storage: commitment hash => timestamp
    mapping(bytes32 => uint256) public commitments;

    /// @notice Reserved names that cannot be registered publicly
    mapping(bytes32 => bool) public reservedNames;

    // Minimum and maximum commitment age (prevents front-running)
    uint256 public constant MIN_COMMITMENT_AGE = 10; // 10 seconds (Selendra has 1s blocks)
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
    event NameReserved(string name, bytes32 indexed label);
    event NameUnreserved(string name, bytes32 indexed label);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event CommitmentConsumed(bytes32 indexed commitment, address indexed registrant);
    event WithdrawalCompleted(address indexed to, uint256 amount);

    constructor(
        ISNSRegistry _sns,
        BaseRegistrar _baseRegistrar,
        IPriceOracle _priceOracle
    ) Ownable(msg.sender) {
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
        return valid(name) && !reservedNames[label] && baseRegistrar.available(tokenId);
    }

    /**
     * @notice Check if a name is reserved
     * @param name The name to check (without .sel)
     * @return True if reserved
     */
    function isReserved(string memory name) public view returns (bool) {
        return reservedNames[keccak256(bytes(name))];
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
     * @dev Commitment must be unique (not already exist)
     * @param commitment The commitment hash from makeCommitment
     */
    function commit(bytes32 commitment) external {
        if (commitments[commitment] != 0) {
            revert SNS_CommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
        emit Commit(commitment);
    }

    /**
     * @notice Register a name after committing
     * @dev Registration flow:
     *      1. Verify commitment exists and is within valid age range
     *      2. Delete commitment to prevent replay attacks
     *      3. Validate name availability and duration
     *      4. Calculate and verify payment
     *      5. Register via BaseRegistrar
     *      6. Set resolver records if provided
     *      7. Set reverse record if requested
     *      8. Refund excess payment
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
        if (commitTime == 0) {
            revert SNS_CommitmentNotFound(commitment);
        }
        if (block.timestamp < commitTime + MIN_COMMITMENT_AGE) {
            revert SNS_CommitmentTooNew(commitment, commitTime, MIN_COMMITMENT_AGE);
        }
        if (block.timestamp > commitTime + MAX_COMMITMENT_AGE) {
            revert SNS_CommitmentExpired(commitment, commitTime, MAX_COMMITMENT_AGE);
        }

        // Delete commitment to prevent replay
        delete commitments[commitment];
        emit CommitmentConsumed(commitment, msg.sender);

        // Validate name
        if (!available(name)) {
            revert SNS_NameNotAvailable(name);
        }
        if (duration < MIN_REGISTRATION_DURATION) {
            revert SNS_DurationTooShort(duration, MIN_REGISTRATION_DURATION);
        }

        // Calculate price
        (uint256 base, uint256 premium) = rentPrice(name, duration);
        uint256 price = base + premium;
        if (msg.value < price) {
            revert SNS_InsufficientPayment(msg.value, price);
        }

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
            (bool success, ) = payable(msg.sender).call{value: msg.value - price}("");
            if (!success) {
                revert SNS_RefundFailed(msg.sender, msg.value - price);
            }
        }
    }

    /**
     * @notice Renew a name registration
     * @dev Name must already be registered (not available)
     * @param name The name to renew (without .sel)
     * @param duration Additional duration in seconds
     */
    function renew(string calldata name, uint256 duration) external payable {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        if (baseRegistrar.available(tokenId)) {
            revert SNS_NameNotAvailable(name);
        }

        (uint256 basePrice, ) = rentPrice(name, duration);
        if (msg.value < basePrice) {
            revert SNS_InsufficientPayment(msg.value, basePrice);
        }

        // Renew through BaseRegistrar
        uint256 newExpires = baseRegistrar.renew(tokenId, duration);

        emit NameRenewed(name, label, basePrice, newExpires);

        // Refund excess
        if (msg.value > basePrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - basePrice}("");
            if (!success) {
                revert SNS_RefundFailed(msg.sender, msg.value - basePrice);
            }
        }
    }

    /**
     * @notice Withdraw collected fees (only owner)
     * @param to Address to send fees to
     */
    function withdraw(address payable to) external onlyOwner {
        uint256 amount = address(this).balance;
        to.transfer(amount);
        emit WithdrawalCompleted(to, amount);
    }

    // ============ Batch Operations ============

    /**
     * @notice Check availability of multiple names in a single call
     * @param names Array of names to check (without .sel)
     * @return results Array of availability status for each name
     */
    function batchAvailable(string[] calldata names) external view returns (bool[] memory results) {
        results = new bool[](names.length);
        uint256 len = names.length;
        for (uint256 i = 0; i < len; ) {
            results[i] = available(names[i]);
            unchecked { ++i; }
        }
        return results;
    }

    /**
     * @notice Get prices for multiple names in a single call
     * @param names Array of names to check (without .sel)
     * @param duration Registration duration in seconds
     * @return basePrices Array of base prices for each name
     * @return premiums Array of premium prices for each name
     */
    function batchRentPrice(
        string[] calldata names,
        uint256 duration
    ) external view returns (uint256[] memory basePrices, uint256[] memory premiums) {
        basePrices = new uint256[](names.length);
        premiums = new uint256[](names.length);
        uint256 len = names.length;
        for (uint256 i = 0; i < len; ) {
            (basePrices[i], premiums[i]) = rentPrice(names[i], duration);
            unchecked { ++i; }
        }
        return (basePrices, premiums);
    }

    /**
     * @notice Renew multiple names in a single transaction
     * @dev Total payment must cover all renewals. Excess is refunded.
     * @param names Array of names to renew (without .sel)
     * @param duration Additional duration in seconds for each name
     */
    function batchRenew(string[] calldata names, uint256 duration) external payable {
        uint256 totalPrice = 0;
        uint256 len = names.length;
        
        // Calculate total price first
        for (uint256 i = 0; i < len; ) {
            (uint256 basePrice, ) = rentPrice(names[i], duration);
            totalPrice += basePrice;
            unchecked { ++i; }
        }
        
        if (msg.value < totalPrice) {
            revert SNS_InsufficientPayment(msg.value, totalPrice);
        }
        
        // Process all renewals
        for (uint256 i = 0; i < len; ) {
            bytes32 label = keccak256(bytes(names[i]));
            uint256 tokenId = uint256(label);
            
            if (baseRegistrar.available(tokenId)) {
                revert SNS_NameNotAvailable(names[i]);
            }
            
            (uint256 basePrice, ) = rentPrice(names[i], duration);
            uint256 newExpires = baseRegistrar.renew(tokenId, duration);
            
            emit NameRenewed(names[i], label, basePrice, newExpires);
            unchecked { ++i; }
        }
        
        // Refund excess
        if (msg.value > totalPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            if (!success) {
                revert SNS_RefundFailed(msg.sender, msg.value - totalPrice);
            }
        }
    }

    /**
     * @notice Submit multiple commitments in a single transaction
     * @param commitmentList Array of commitment hashes
     */
    function batchCommit(bytes32[] calldata commitmentList) external {
        uint256 len = commitmentList.length;
        for (uint256 i = 0; i < len; ) {
            if (commitments[commitmentList[i]] != 0) {
                revert SNS_CommitmentExists(commitmentList[i]);
            }
            commitments[commitmentList[i]] = block.timestamp;
            emit Commit(commitmentList[i]);
            unchecked { ++i; }
        }
    }

    /**
     * @notice Execute multiple calls in a single transaction
     * @dev Useful for batch operations like reserving multiple names
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; ) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            if (!success) {
                revert SNS_MulticallFailed(i, data[i]);
            }
            results[i] = result;
            unchecked { ++i; }
        }
        return results;
    }

    // ============ Governance Functions ============

    /**
     * @notice Reserve a name (only owner)
     * @param name The name to reserve (without .sel)
     */
    function reserveName(string calldata name) external onlyOwner {
        bytes32 label = keccak256(bytes(name));
        reservedNames[label] = true;
        emit NameReserved(name, label);
    }

    /**
     * @notice Reserve multiple names (only owner)
     * @param names Array of names to reserve
     */
    function reserveNames(string[] calldata names) external onlyOwner {
        uint256 len = names.length;
        for (uint256 i = 0; i < len; ) {
            bytes32 label = keccak256(bytes(names[i]));
            reservedNames[label] = true;
            emit NameReserved(names[i], label);
            unchecked { ++i; }
        }
    }

    /**
     * @notice Unreserve a name (only owner)
     * @param name The name to unreserve
     */
    function unreserveName(string calldata name) external onlyOwner {
        bytes32 label = keccak256(bytes(name));
        reservedNames[label] = false;
        emit NameUnreserved(name, label);
    }

    /**
     * @notice Register a reserved name to a specific address (only owner)
     * @dev Bypasses commit-reveal and payment for reserved names.
     *      Name is automatically unreserved after registration.
     * @param name The reserved name to register
     * @param owner The address to register the name to
     * @param duration Registration duration in seconds
     * @param resolver The resolver address (optional)
     */
    function registerReserved(
        string calldata name,
        address owner,
        uint256 duration,
        address resolver
    ) external onlyOwner {
        bytes32 label = keccak256(bytes(name));
        if (!reservedNames[label]) {
            revert SNS_NameNotReserved(name);
        }
        if (!valid(name)) {
            revert SNS_InvalidName(name, "Invalid characters or length");
        }
        
        uint256 tokenId = uint256(label);
        if (!baseRegistrar.available(tokenId)) {
            revert SNS_NameNotAvailable(name);
        }
        
        uint256 expires;
        if (resolver != address(0)) {
            expires = baseRegistrar.registerWithConfig(tokenId, owner, duration, resolver);
        } else {
            expires = baseRegistrar.register(tokenId, owner, duration);
        }
        
        // Remove from reserved after registration
        reservedNames[label] = false;
        
        emit NameRegistered(name, label, owner, 0, expires);
    }

    /**
     * @notice Update the price oracle (only owner)
     * @param newOracle The new price oracle address
     */
    function setPriceOracle(IPriceOracle newOracle) external onlyOwner {
        if (address(newOracle) == address(0)) {
            revert SNS_InvalidOracle();
        }
        emit PriceOracleUpdated(address(priceOracle), address(newOracle));
        priceOracle = newOracle;
    }

    // ============ Internal Functions ============

    /**
     * @notice Set resolver records via low-level calls
     * @dev Each data item should be an encoded function call to the resolver.
     *      The node parameter is currently unused but kept for future compatibility.
     * @param resolverAddr The resolver contract address
     * @param data Array of encoded resolver function calls
     */
    function _setRecords(
        address resolverAddr,
        bytes32 /* node */,
        bytes[] calldata data
    ) internal {
        uint256 len = data.length;
        for (uint256 i = 0; i < len; ) {
            (bool success, ) = resolverAddr.call(data[i]);
            if (!success) {
                revert SNS_MulticallFailed(i, data[i]);
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Set up reverse resolution for a name
     * @dev Placeholder for ReverseRegistrar integration
     * @param name The name (without .sel)
     * @param owner The owner address
     */
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
 * @dev Pricing tiers match SNS documentation:
 *      - 3 chars: 1000 SEL/year (premium short names)
 *      - 4 chars: 250 SEL/year
 *      - 5+ chars: 50 SEL/year (standard names)
 */
contract SimplePriceOracle is IPriceOracle {
    // Prices in SEL (with 18 decimals)
    uint256 public constant PRICE_3_CHAR = 1000 ether; // 1000 SEL per year
    uint256 public constant PRICE_4_CHAR = 250 ether; // 250 SEL per year
    uint256 public constant PRICE_5_PLUS = 50 ether; // 50 SEL per year

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
