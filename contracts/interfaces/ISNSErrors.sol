// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SNS Custom Errors
 * @notice Gas-efficient custom errors for Selendra Naming Service
 * @dev Using custom errors instead of require strings saves ~50 gas per error
 */

// ============ Registry Errors ============

/// @notice Caller is not authorized to modify this node
/// @param node The node being modified
/// @param caller The unauthorized caller
error SNS_NotAuthorized(bytes32 node, address caller);

/// @notice Record does not exist for this node
/// @param node The queried node
error SNS_RecordNotFound(bytes32 node);

// ============ Registrar Errors ============

/// @notice Name is not available for registration (by name string)
/// @param name The unavailable name
error SNS_NameNotAvailable(string name);

/// @notice Name is not available for registration (by token ID)
/// @param tokenId The unavailable token ID
error SNS_NameNotAvailableById(uint256 tokenId);

/// @notice Name has expired and is past grace period
/// @param tokenId The token ID of the expired name
/// @param expiry The expiry timestamp
error SNS_NameExpired(uint256 tokenId, uint256 expiry);

/// @notice Name is still in grace period
/// @param tokenId The token ID
/// @param graceEnd When grace period ends
error SNS_InGracePeriod(uint256 tokenId, uint256 graceEnd);

/// @notice Caller is not a controller
/// @param caller The unauthorized caller
error SNS_NotController(address caller);

/// @notice Caller is not the owner or approved operator
/// @param caller The unauthorized caller
/// @param tokenId The token ID
error SNS_NotApprovedOrOwner(address caller, uint256 tokenId);

/// @notice Duration would cause overflow
/// @param duration The problematic duration
error SNS_DurationTooLong(uint256 duration);

/// @notice Duration would cause timestamp overflow
/// @param duration The problematic duration
error SNS_DurationOverflow(uint256 duration);

// ============ Controller Errors ============

/// @notice Name does not meet validation requirements
/// @param name The invalid name
/// @param reason Human-readable reason
error SNS_InvalidName(string name, string reason);

/// @notice Name is reserved and cannot be registered publicly
/// @param name The reserved name
error SNS_NameReserved(string name);

/// @notice Name is not reserved (for registerReserved calls)
/// @param name The non-reserved name
error SNS_NameNotReserved(string name);

/// @notice Commitment has not been made
/// @param commitment The missing commitment hash
error SNS_CommitmentNotFound(bytes32 commitment);

/// @notice Commitment was made too recently
/// @param commitment The commitment hash
/// @param madeAt When commitment was made
/// @param minAge Minimum age required
error SNS_CommitmentTooNew(bytes32 commitment, uint256 madeAt, uint256 minAge);

/// @notice Commitment has expired
/// @param commitment The commitment hash
/// @param madeAt When commitment was made
/// @param maxAge Maximum age allowed
error SNS_CommitmentExpired(bytes32 commitment, uint256 madeAt, uint256 maxAge);

/// @notice Commitment already exists
/// @param commitment The existing commitment hash
error SNS_CommitmentExists(bytes32 commitment);

/// @notice Registration duration is too short
/// @param duration The provided duration
/// @param minDuration The minimum required duration
error SNS_DurationTooShort(uint256 duration, uint256 minDuration);

/// @notice Payment is insufficient
/// @param sent Amount sent
/// @param required Amount required
error SNS_InsufficientPayment(uint256 sent, uint256 required);

/// @notice Refund transfer failed
/// @param recipient The recipient address
/// @param amount The refund amount
error SNS_RefundFailed(address recipient, uint256 amount);

// ============ Resolver Errors ============

/// @notice Invalid address length for coin type
/// @param coinType The SLIP-44 coin type
/// @param length The invalid length
/// @param expectedLength The expected length
error SNS_InvalidAddressLength(uint256 coinType, uint256 length, uint256 expectedLength);

/// @notice Multicall sub-call failed
/// @param index The index of the failed call
/// @param data The call data that failed
error SNS_MulticallFailed(uint256 index, bytes data);

// ============ Price Oracle Errors ============

/// @notice Name is too short for pricing
/// @param name The short name
/// @param length The name length
/// @param minLength The minimum required length
error SNS_NameTooShort(string name, uint256 length, uint256 minLength);

/// @notice Discount percentage is too high
/// @param discount The provided discount
/// @param maxDiscount The maximum allowed discount
error SNS_DiscountTooHigh(uint256 discount, uint256 maxDiscount);

/// @notice Array length mismatch in batch operation
/// @param length1 First array length
/// @param length2 Second array length
error SNS_ArrayLengthMismatch(uint256 length1, uint256 length2);

// ============ Reverse Registrar Errors ============

/// @notice Caller cannot claim reverse record for this address
/// @param addr The address being claimed
/// @param caller The unauthorized caller
error SNS_CannotClaimReverse(address addr, address caller);

// ============ General Errors ============

/// @notice Zero address provided where not allowed
/// @param paramName The parameter name
error SNS_ZeroAddress(string paramName);

/// @notice Invalid oracle address
error SNS_InvalidOracle();
