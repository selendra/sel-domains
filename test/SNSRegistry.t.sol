// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {SNSRegistry, ISNSRegistry} from "../src/SNSRegistry.sol";

contract SNSRegistryTest is Test {
    SNSRegistry public registry;
    address public owner;
    address public alice;
    address public bob;

    bytes32 public constant ROOT_NODE = bytes32(0);
    bytes32 public selNode; // namehash("sel")

    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        registry = new SNSRegistry();

        // Calculate namehash("sel") = keccak256(keccak256(0x0, keccak256("sel")))
        selNode = keccak256(abi.encodePacked(ROOT_NODE, keccak256("sel")));
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsRootOwner() public view {
        assertEq(registry.owner(ROOT_NODE), owner);
    }

    function test_Constructor_RootRecordExists() public view {
        assertTrue(registry.recordExists(ROOT_NODE));
    }

    // ============ setSubnodeOwner Tests ============

    function test_SetSubnodeOwner_CreatesSubnode() public {
        bytes32 label = keccak256("sel");

        vm.expectEmit(true, true, true, true);
        emit NewOwner(ROOT_NODE, label, alice);

        bytes32 subnode = registry.setSubnodeOwner(ROOT_NODE, label, alice);

        assertEq(subnode, selNode);
        assertEq(registry.owner(selNode), alice);
        assertTrue(registry.recordExists(selNode));
    }

    function test_SetSubnodeOwner_RevertIfNotAuthorised() public {
        vm.prank(alice);
        vm.expectRevert("SNS: Not authorised");
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), alice);
    }

    function test_SetSubnodeOwner_AllowsOperator() public {
        registry.setApprovalForAll(alice, true);

        vm.prank(alice);
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), bob);

        assertEq(registry.owner(selNode), bob);
    }

    // ============ setOwner Tests ============

    function test_SetOwner_TransfersOwnership() public {
        // Create subnode first
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        vm.expectEmit(true, true, true, true);
        emit Transfer(selNode, alice);

        registry.setOwner(selNode, alice);

        assertEq(registry.owner(selNode), alice);
    }

    function test_SetOwner_RevertIfNotAuthorised() public {
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        vm.prank(alice);
        vm.expectRevert("SNS: Not authorised");
        registry.setOwner(selNode, alice);
    }

    // ============ setResolver Tests ============

    function test_SetResolver_SetsResolver() public {
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);
        address resolver = makeAddr("resolver");

        vm.expectEmit(true, true, true, true);
        emit NewResolver(selNode, resolver);

        registry.setResolver(selNode, resolver);

        assertEq(registry.resolver(selNode), resolver);
    }

    // ============ setTTL Tests ============

    function test_SetTTL_SetsTTL() public {
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);
        uint64 ttl = 3600;

        vm.expectEmit(true, true, true, true);
        emit NewTTL(selNode, ttl);

        registry.setTTL(selNode, ttl);

        assertEq(registry.ttl(selNode), ttl);
    }

    // ============ setRecord Tests ============

    function test_SetRecord_SetsAllFields() public {
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        address resolver = makeAddr("resolver");
        uint64 ttl = 3600;

        registry.setRecord(selNode, alice, resolver, ttl);

        assertEq(registry.owner(selNode), alice);
        assertEq(registry.resolver(selNode), resolver);
        assertEq(registry.ttl(selNode), ttl);
    }

    // ============ setSubnodeRecord Tests ============

    function test_SetSubnodeRecord_CreatesSubnodeWithRecords() public {
        address resolver = makeAddr("resolver");
        uint64 ttl = 3600;

        registry.setSubnodeRecord(
            ROOT_NODE,
            keccak256("sel"),
            alice,
            resolver,
            ttl
        );

        assertEq(registry.owner(selNode), alice);
        assertEq(registry.resolver(selNode), resolver);
        assertEq(registry.ttl(selNode), ttl);
    }

    // ============ Approval Tests ============

    function test_SetApprovalForAll_SetsApproval() public {
        vm.expectEmit(true, true, true, true);
        emit ApprovalForAll(owner, alice, true);

        registry.setApprovalForAll(alice, true);

        assertTrue(registry.isApprovedForAll(owner, alice));
    }

    function test_SetApprovalForAll_RevokesApproval() public {
        registry.setApprovalForAll(alice, true);
        registry.setApprovalForAll(alice, false);

        assertFalse(registry.isApprovedForAll(owner, alice));
    }

    // ============ Owner Return Value Tests ============

    function test_Owner_ReturnsZeroForContractOwned() public {
        // When owner is set to the contract itself, it should return 0
        registry.setSubnodeOwner(
            ROOT_NODE,
            keccak256("sel"),
            address(registry)
        );
        assertEq(registry.owner(selNode), address(0));
    }

    // ============ Nested Subdomains ============

    function test_NestedSubdomains() public {
        // Create sel TLD
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        // Create alice.sel
        bytes32 aliceLabel = keccak256("alice");
        bytes32 aliceNode = keccak256(abi.encodePacked(selNode, aliceLabel));
        registry.setSubnodeOwner(selNode, aliceLabel, alice);

        assertEq(registry.owner(aliceNode), alice);

        // Alice creates sub.alice.sel
        vm.prank(alice);
        bytes32 subLabel = keccak256("sub");
        bytes32 subNode = keccak256(abi.encodePacked(aliceNode, subLabel));
        registry.setSubnodeOwner(aliceNode, subLabel, bob);

        assertEq(registry.owner(subNode), bob);
    }
}
