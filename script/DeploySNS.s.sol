// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SNSRegistry} from "../src/SNSRegistry.sol";
import {BaseRegistrar} from "../src/BaseRegistrar.sol";
import {PublicResolver} from "../src/PublicResolver.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {
    SELRegistrarController,
    ISNSRegistry,
    IPriceOracle
} from "../src/SELRegistrarController.sol";
import {ReverseRegistrar} from "../src/ReverseRegistrar.sol";

/**
 * @title DeploySNS
 * @notice Deploys the complete SNS (Selendra Naming Service) stack
 *
 * Usage:
 *   forge script script/DeploySNS.s.sol:DeploySNS --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
 *
 * With verification:
 *   forge script script/DeploySNS.s.sol:DeploySNS --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY --verify
 */
contract DeploySNS is Script {
    // Deployment addresses
    SNSRegistry public registry;
    BaseRegistrar public registrar;
    PublicResolver public resolver;
    PriceOracle public priceOracle;
    SELRegistrarController public controller;
    ReverseRegistrar public reverseRegistrar;

    // Constants
    bytes32 public constant ROOT_NODE = bytes32(0);

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying SNS contracts...");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy SNS Registry
        registry = new SNSRegistry();
        console.log("SNSRegistry deployed at:", address(registry));

        // 2. Calculate namehash("sel")
        bytes32 selNode = keccak256(
            abi.encodePacked(ROOT_NODE, keccak256("sel"))
        );
        console.log("SEL node:");
        console.logBytes32(selNode);

        // 3. Create .sel TLD in registry
        registry.setSubnodeOwner(ROOT_NODE, keccak256("sel"), deployer);
        console.log("Created .sel TLD");

        // 4. Deploy Public Resolver
        resolver = new PublicResolver(ISNSRegistry(address(registry)));
        console.log("PublicResolver deployed at:", address(resolver));

        // 5. Deploy Base Registrar
        registrar = new BaseRegistrar(address(registry), selNode);
        console.log("BaseRegistrar deployed at:", address(registrar));

        // 6. Transfer .sel ownership to BaseRegistrar
        registry.setOwner(selNode, address(registrar));
        console.log("Transferred .sel ownership to BaseRegistrar");

        // 7. Set resolver for .sel TLD
        registrar.setResolver(address(resolver));
        console.log("Set resolver for .sel TLD");

        // 8. Deploy Price Oracle
        priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));

        // 9. Deploy SEL Registrar Controller
        controller = new SELRegistrarController(
            ISNSRegistry(address(registry)),
            registrar,
            IPriceOracle(address(priceOracle))
        );
        console.log("SELRegistrarController deployed at:", address(controller));

        // 10. Add controller to BaseRegistrar
        registrar.addController(address(controller));
        console.log("Added controller to BaseRegistrar");

        // 11. Set up reverse registrar
        // Calculate namehash("reverse")
        bytes32 reverseNode = keccak256(
            abi.encodePacked(ROOT_NODE, keccak256("reverse"))
        );
        // Calculate namehash("addr.reverse")
        bytes32 addrReverseNode = keccak256(
            abi.encodePacked(reverseNode, keccak256("addr"))
        );

        // Create reverse TLD
        registry.setSubnodeOwner(ROOT_NODE, keccak256("reverse"), deployer);
        // Create addr.reverse
        registry.setSubnodeOwner(reverseNode, keccak256("addr"), deployer);

        // Deploy Reverse Registrar
        reverseRegistrar = new ReverseRegistrar(
            ISNSRegistry(address(registry)),
            address(resolver)
        );
        console.log("ReverseRegistrar deployed at:", address(reverseRegistrar));

        // Transfer addr.reverse ownership to ReverseRegistrar
        registry.setOwner(addrReverseNode, address(reverseRegistrar));
        console.log("Transferred addr.reverse ownership to ReverseRegistrar");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("SNSRegistry:", address(registry));
        console.log("PublicResolver:", address(resolver));
        console.log("BaseRegistrar:", address(registrar));
        console.log("PriceOracle:", address(priceOracle));
        console.log("SELRegistrarController:", address(controller));
        console.log("ReverseRegistrar:", address(reverseRegistrar));
        console.log("==========================\n");
    }
}

/**
 * @title AddController
 * @notice Adds a new controller to the BaseRegistrar
 *
 * Usage:
 *   CONTROLLER=0x... BASE_REGISTRAR=0x... forge script script/DeploySNS.s.sol:AddController --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
 */
contract AddController is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address controllerAddress = vm.envAddress("CONTROLLER");
        address baseRegistrarAddress = vm.envAddress("BASE_REGISTRAR");

        vm.startBroadcast(deployerPrivateKey);

        BaseRegistrar registrar = BaseRegistrar(baseRegistrarAddress);
        registrar.addController(controllerAddress);

        console.log("Added controller:", controllerAddress);

        vm.stopBroadcast();
    }
}
