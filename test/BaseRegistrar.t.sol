// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {SNSRegistry, ISNSRegistry} from "../src/SNSRegistry.sol";
import {BaseRegistrar} from "../src/BaseRegistrar.sol";

contract BaseRegistrarTest is Test {
    SNSRegistry public registry;
    BaseRegistrar public registrar;

    address public owner;
    address public controller;
    address public alice;
    address public bob;

    bytes32 public constant ROOT_NODE = bytes32(0);
    bytes32 public selNode;

    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event NameRegistered(
        uint256 indexed id,
        address indexed owner,
        uint256 expires
    );
    event NameRenewed(uint256 indexed id, uint256 expires);

    function setUp() public {
        owner = address(this);
        controller = makeAddr("controller");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Set a realistic timestamp (Foundry defaults to 0)
        vm.warp(1704067200); // 2024-01-01 00:00:00 UTC

        // Deploy registry
        registry = new SNSRegistry();

        // Calculate namehash("sel")
        selNode = keccak256(abi.encodePacked(ROOT_NODE, keccak256("sel")));

        // Create .sel TLD owned by owner
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        // Deploy registrar
        registrar = new BaseRegistrar(address(registry), selNode);

        // Transfer .sel ownership to registrar
        registry.setOwner(selNode, address(registrar));

        // Add controller
        registrar.addController(controller);
    }

    // ============ Controller Management ============

    function test_AddController() public {
        address newController = makeAddr("newController");

        vm.expectEmit(true, true, true, true);
        emit ControllerAdded(newController);

        registrar.addController(newController);

        assertTrue(registrar.controllers(newController));
    }

    function test_AddController_RevertIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        registrar.addController(alice);
    }

    function test_RemoveController() public {
        vm.expectEmit(true, true, true, true);
        emit ControllerRemoved(controller);

        registrar.removeController(controller);

        assertFalse(registrar.controllers(controller));
    }

    // ============ Registration ============

    function test_Register_Success() public {
        uint256 id = uint256(keccak256("alice"));
        uint256 duration = 365 days;

        vm.prank(controller);
        uint256 expires = registrar.register(id, alice, duration);

        assertEq(registrar.ownerOf(id), alice);
        assertEq(expires, block.timestamp + duration);
        assertEq(registrar.nameExpires(id), block.timestamp + duration);
    }

    function test_Register_UpdatesRegistry() public {
        uint256 id = uint256(keccak256("alice"));
        bytes32 label = bytes32(id);
        bytes32 domainNode = keccak256(abi.encodePacked(selNode, label));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        // Check registry is updated
        assertEq(registry.owner(domainNode), alice);
    }

    function test_Register_RevertIfNotController() public {
        vm.prank(alice);
        vm.expectRevert("Not a controller");
        registrar.register(uint256(keccak256("alice")), alice, 365 days);
    }

    function test_Register_RevertIfNotAvailable() public {
        uint256 id = uint256(keccak256("alice"));

        vm.startPrank(controller);
        registrar.register(id, alice, 365 days);

        vm.expectRevert("Name not available");
        registrar.register(id, bob, 365 days);
        vm.stopPrank();
    }

    // ============ Availability ============

    function test_Available_TrueForNewName() public view {
        uint256 id = uint256(keccak256("alice"));
        assertTrue(registrar.available(id));
    }

    function test_Available_FalseForRegisteredName() public {
        uint256 id = uint256(keccak256("alice"));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        assertFalse(registrar.available(id));
    }

    function test_Available_TrueAfterExpiry() public {
        uint256 id = uint256(keccak256("alice"));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        // Fast forward past expiry + grace period
        vm.warp(block.timestamp + 365 days + 90 days + 1);

        assertTrue(registrar.available(id));
    }

    // ============ RegisterWithConfig ============

    function test_RegisterWithConfig_SetsResolver() public {
        uint256 id = uint256(keccak256("alice"));
        address resolver = makeAddr("resolver");
        bytes32 label = bytes32(id);
        bytes32 domainNode = keccak256(abi.encodePacked(selNode, label));

        vm.prank(controller);
        registrar.registerWithConfig(id, alice, 365 days, resolver);

        assertEq(registrar.ownerOf(id), alice);
        assertEq(registry.resolver(domainNode), resolver);
    }

    // ============ Renewal ============

    function test_Renew_ExtendsExpiry() public {
        uint256 id = uint256(keccak256("alice"));

        vm.startPrank(controller);
        registrar.register(id, alice, 365 days);

        uint256 originalExpiry = registrar.nameExpires(id);

        registrar.renew(id, 365 days);
        vm.stopPrank();

        assertEq(registrar.nameExpires(id), originalExpiry + 365 days);
    }

    function test_Renew_RevertIfExpired() public {
        uint256 id = uint256(keccak256("alice"));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        // Fast forward past expiry + grace period
        vm.warp(block.timestamp + 365 days + 90 days + 1);

        vm.prank(controller);
        vm.expectRevert("Name expired");
        registrar.renew(id, 365 days);
    }

    // ============ Transfer ============

    function test_Transfer_UpdatesRegistry() public {
        uint256 id = uint256(keccak256("alice"));
        bytes32 label = bytes32(id);
        bytes32 domainNode = keccak256(abi.encodePacked(selNode, label));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        // Transfer NFT
        vm.prank(alice);
        registrar.transferFrom(alice, bob, id);

        // Check NFT ownership
        assertEq(registrar.ownerOf(id), bob);

        // Check registry is updated
        assertEq(registry.owner(domainNode), bob);
    }

    // ============ Reclaim ============

    function test_Reclaim_UpdatesRegistry() public {
        uint256 id = uint256(keccak256("alice"));
        bytes32 label = bytes32(id);
        bytes32 domainNode = keccak256(abi.encodePacked(selNode, label));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        // Reclaim to new address
        vm.prank(alice);
        registrar.reclaim(id, bob);

        // Registry updated but NFT not transferred
        assertEq(registry.owner(domainNode), bob);
        assertEq(registrar.ownerOf(id), alice);
    }

    // ============ ERC-721 ============

    function test_Name() public view {
        assertEq(registrar.name(), "Selendra Name Service");
    }

    function test_Symbol() public view {
        assertEq(registrar.symbol(), "SNS");
    }

    function test_TokenURI() public {
        uint256 id = uint256(keccak256("alice"));

        vm.prank(controller);
        registrar.register(id, alice, 365 days);

        string memory uri = registrar.tokenURI(id);
        assertTrue(bytes(uri).length > 0);
    }
}
