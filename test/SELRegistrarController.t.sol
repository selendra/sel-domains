// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {SNSRegistry, ISNSRegistry} from "../src/SNSRegistry.sol";
import {BaseRegistrar} from "../src/BaseRegistrar.sol";
import {
    SELRegistrarController,
    SimplePriceOracle,
    IPriceOracle
} from "../src/SELRegistrarController.sol";

contract SELRegistrarControllerTest is Test {
    SNSRegistry public registry;
    BaseRegistrar public registrar;
    SimplePriceOracle public priceOracle;
    SELRegistrarController public controller;

    address public owner;
    address public alice;
    address public bob;

    bytes32 public constant ROOT_NODE = bytes32(0);
    bytes32 public selNode;

    // Commitment parameters
    bytes32 public constant SECRET = keccak256("secret");
    uint256 public constant DURATION = 365 days;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Set a realistic timestamp (Foundry defaults to 0)
        vm.warp(1704067200); // 2024-01-01 00:00:00 UTC

        // Give alice some ETH
        vm.deal(alice, 1000 ether);

        // Deploy contracts
        registry = new SNSRegistry();
        selNode = keccak256(abi.encodePacked(ROOT_NODE, keccak256("sel")));
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        registrar = new BaseRegistrar(address(registry), selNode);
        registry.setOwner(selNode, address(registrar));

        priceOracle = new SimplePriceOracle();
        controller = new SELRegistrarController(
            ISNSRegistry(address(registry)),
            registrar,
            IPriceOracle(address(priceOracle))
        );

        // Add controller to registrar
        registrar.addController(address(controller));
    }

    // ============ Name Validation ============

    function test_Valid_AcceptsValidNames() public view {
        assertTrue(controller.valid("abc"));
        assertTrue(controller.valid("alice"));
        assertTrue(controller.valid("test-name"));
        assertTrue(controller.valid("123abc"));
        assertTrue(controller.valid("a1b2c3"));
    }

    function test_Valid_RejectsTooShort() public view {
        assertFalse(controller.valid("ab"));
        assertFalse(controller.valid("a"));
        assertFalse(controller.valid(""));
    }

    function test_Valid_RejectsInvalidChars() public view {
        assertFalse(controller.valid("Alice")); // uppercase
        assertFalse(controller.valid("alice.bob")); // dot
        assertFalse(controller.valid("alice_bob")); // underscore
        assertFalse(controller.valid("alice bob")); // space
    }

    function test_Valid_RejectsLeadingTrailingHyphen() public view {
        assertFalse(controller.valid("-alice"));
        assertFalse(controller.valid("alice-"));
    }

    // ============ Availability ============

    function test_Available_NewName() public view {
        assertTrue(controller.available("alice"));
    }

    function test_Available_AfterRegistration() public {
        _commitAndRegister("alice", alice);
        assertFalse(controller.available("alice"));
    }

    // ============ Pricing ============

    function test_RentPrice_3CharName() public view {
        (uint256 base, uint256 premium) = controller.rentPrice("abc", DURATION);
        assertEq(base, 100 ether); // 100 SEL for 3-char
        assertEq(premium, 0);
    }

    function test_RentPrice_4CharName() public view {
        (uint256 base, uint256 premium) = controller.rentPrice(
            "abcd",
            DURATION
        );
        assertEq(base, 50 ether); // 50 SEL for 4-char
        assertEq(premium, 0);
    }

    function test_RentPrice_5PlusCharName() public view {
        (uint256 base, uint256 premium) = controller.rentPrice(
            "alice",
            DURATION
        );
        assertEq(base, 10 ether); // 10 SEL for 5+ char
        assertEq(premium, 0);
    }

    // ============ Commitment ============

    function test_Commit() public {
        bytes32 commitment = controller.makeCommitment(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);

        assertEq(controller.commitments(commitment), block.timestamp);
    }

    function test_Commit_RevertIfExists() public {
        bytes32 commitment = controller.makeCommitment(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);

        vm.expectRevert("Commitment already exists");
        controller.commit(commitment);
    }

    // ============ Registration ============

    function test_Register_Success() public {
        _commitAndRegister("alice", alice);

        uint256 tokenId = uint256(keccak256("alice"));
        assertEq(registrar.ownerOf(tokenId), alice);
    }

    function test_Register_RevertIfNoCommitment() public {
        (uint256 price, ) = controller.rentPrice("alice", DURATION);

        vm.prank(alice);
        vm.expectRevert("No commitment found");
        controller.register{value: price}(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );
    }

    function test_Register_RevertIfCommitmentTooNew() public {
        bytes32 commitment = controller.makeCommitment(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);

        // Try to register immediately (before MIN_COMMITMENT_AGE)
        (uint256 price, ) = controller.rentPrice("alice", DURATION);

        vm.prank(alice);
        vm.expectRevert("Commitment too new");
        controller.register{value: price}(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );
    }

    function test_Register_RevertIfCommitmentExpired() public {
        bytes32 commitment = controller.makeCommitment(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);

        // Fast forward past MAX_COMMITMENT_AGE
        vm.warp(block.timestamp + 25 hours);

        (uint256 price, ) = controller.rentPrice("alice", DURATION);

        vm.prank(alice);
        vm.expectRevert("Commitment expired");
        controller.register{value: price}(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );
    }

    function test_Register_RevertIfInsufficientPayment() public {
        bytes32 commitment = controller.makeCommitment(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);
        vm.warp(block.timestamp + 61); // Past MIN_COMMITMENT_AGE

        vm.prank(alice);
        vm.expectRevert("Insufficient payment");
        controller.register{value: 1 ether}(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );
    }

    function test_Register_RefundsExcess() public {
        bytes32 commitment = controller.makeCommitment(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);
        vm.warp(block.timestamp + 61);

        uint256 balanceBefore = alice.balance;
        (uint256 price, ) = controller.rentPrice("alice", DURATION);
        uint256 overpay = 100 ether;

        vm.prank(alice);
        controller.register{value: price + overpay}(
            "alice",
            alice,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        // Should refund the overpayment
        assertEq(alice.balance, balanceBefore - price);
    }

    // ============ Renewal ============

    function test_Renew_Success() public {
        _commitAndRegister("alice", alice);

        uint256 tokenId = uint256(keccak256("alice"));
        uint256 originalExpiry = registrar.nameExpires(tokenId);

        (uint256 price, ) = controller.rentPrice("alice", DURATION);

        vm.prank(alice);
        controller.renew{value: price}("alice", DURATION);

        assertEq(registrar.nameExpires(tokenId), originalExpiry + DURATION);
    }

    function test_Renew_RevertIfNotRegistered() public {
        (uint256 price, ) = controller.rentPrice("alice", DURATION);

        vm.prank(alice);
        vm.expectRevert("Name not registered");
        controller.renew{value: price}("alice", DURATION);
    }

    // ============ Helper Functions ============

    function _commitAndRegister(string memory name, address to) internal {
        bytes32 commitment = controller.makeCommitment(
            name,
            to,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );

        controller.commit(commitment);
        vm.warp(block.timestamp + 61); // Past MIN_COMMITMENT_AGE

        (uint256 price, ) = controller.rentPrice(name, DURATION);

        vm.prank(to);
        controller.register{value: price}(
            name,
            to,
            DURATION,
            SECRET,
            address(0),
            new bytes[](0),
            false
        );
    }
}
