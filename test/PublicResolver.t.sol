// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {SNSRegistry, ISNSRegistry} from "../src/SNSRegistry.sol";
import {PublicResolver} from "../src/PublicResolver.sol";
import "../src/interfaces/ISNSErrors.sol";

contract PublicResolverTest is Test {
    SNSRegistry public registry;
    PublicResolver public resolver;

    address public owner;
    address public alice;

    bytes32 public constant ROOT_NODE = bytes32(0);
    bytes32 public selNode;
    bytes32 public aliceNode;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");

        registry = new SNSRegistry();
        resolver = new PublicResolver(ISNSRegistry(address(registry)));

        // Create .sel TLD
        selNode = keccak256(abi.encodePacked(ROOT_NODE, keccak256("sel")));
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), owner);

        // Create alice.sel owned by alice
        bytes32 aliceLabel = keccak256("alice");
        aliceNode = keccak256(abi.encodePacked(selNode, aliceLabel));
        registry.setSubnodeOwner(selNode, aliceLabel, alice);
    }

    // ============ Address Records ============

    function test_SetAddr_Success() public {
        vm.prank(alice);
        resolver.setAddr(aliceNode, alice);

        assertEq(resolver.addr(aliceNode), alice);
    }

    function test_SetAddr_RevertIfNotAuthorised() public {
        vm.expectRevert(abi.encodeWithSelector(SNS_NotAuthorized.selector, aliceNode, address(this)));
        resolver.setAddr(aliceNode, alice);
    }

    function test_SetAddr_WithCoinType() public {
        bytes memory selAddress = abi.encodePacked(alice);
        uint256 coinType = 354; // Selendra

        vm.prank(alice);
        resolver.setAddr(aliceNode, coinType, selAddress);

        assertEq(resolver.addr(aliceNode, coinType), selAddress);
    }

    // ============ Text Records ============

    function test_SetText_Success() public {
        vm.prank(alice);
        resolver.setText(aliceNode, "avatar", "https://example.com/avatar.png");

        assertEq(
            resolver.text(aliceNode, "avatar"),
            "https://example.com/avatar.png"
        );
    }

    function test_SetText_MultipleKeys() public {
        vm.startPrank(alice);
        resolver.setText(aliceNode, "avatar", "https://example.com/avatar.png");
        resolver.setText(aliceNode, "url", "https://alice.sel");
        resolver.setText(aliceNode, "com.twitter", "@alice");
        vm.stopPrank();

        assertEq(
            resolver.text(aliceNode, "avatar"),
            "https://example.com/avatar.png"
        );
        assertEq(resolver.text(aliceNode, "url"), "https://alice.sel");
        assertEq(resolver.text(aliceNode, "com.twitter"), "@alice");
    }

    // ============ Content Hash ============

    function test_SetContenthash_Success() public {
        bytes
            memory hash = hex"e3010170122029f2d17be6139079dc48696d1f582a8530eb9805b561eda517e22a892c7e3f1f";

        vm.prank(alice);
        resolver.setContenthash(aliceNode, hash);

        assertEq(resolver.contenthash(aliceNode), hash);
    }

    // ============ Name (Reverse Resolution) ============

    function test_SetName_Success() public {
        vm.prank(alice);
        resolver.setName(aliceNode, "alice.sel");

        assertEq(resolver.name(aliceNode), "alice.sel");
    }

    // ============ Multicall ============

    function test_Multicall_Success() public {
        bytes[] memory calls = new bytes[](2);
        // Use function selector directly to avoid ambiguity
        calls[0] = abi.encodeWithSelector(
            bytes4(keccak256("setAddr(bytes32,address)")),
            aliceNode,
            alice
        );
        calls[1] = abi.encodeCall(
            resolver.setText,
            (aliceNode, "avatar", "https://example.com")
        );

        vm.prank(alice);
        resolver.multicall(calls);

        assertEq(resolver.addr(aliceNode), alice);
        assertEq(resolver.text(aliceNode, "avatar"), "https://example.com");
    }

    // ============ Interface Support ============

    function test_SupportsInterface() public view {
        assertTrue(resolver.supportsInterface(0x3b3b57de)); // addr(bytes32)
        assertTrue(resolver.supportsInterface(0xf1cb7e06)); // addr(bytes32,uint256)
        assertTrue(resolver.supportsInterface(0x59d1d43c)); // text(bytes32,string)
        assertTrue(resolver.supportsInterface(0xbc1c58d1)); // contenthash(bytes32)
        assertTrue(resolver.supportsInterface(0x691f3431)); // name(bytes32)
        assertTrue(resolver.supportsInterface(0x01ffc9a7)); // supportsInterface
    }

    // ============ Operator Approval ============

    function test_SetAddr_ByOperator() public {
        // Alice approves owner as operator
        vm.prank(alice);
        registry.setApprovalForAll(owner, true);

        // Owner can now set records for alice.sel
        resolver.setAddr(aliceNode, alice);

        assertEq(resolver.addr(aliceNode), alice);
    }
}
