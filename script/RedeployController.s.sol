// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BaseRegistrar} from "../src/BaseRegistrar.sol";
import {
    SELRegistrarController,
    ISNSRegistry,
    IPriceOracle
} from "../src/SELRegistrarController.sol";

/**
 * @title RedeployController
 * @notice Redeploys only the SELRegistrarController and adds it to BaseRegistrar
 *
 * Usage:
 *   REGISTRY=0x... BASE_REGISTRAR=0x... PRICE_ORACLE=0x... forge script script/RedeployController.s.sol:RedeployController \
 *     --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY --legacy
 */
contract RedeployController is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = vm.envAddress("REGISTRY");
        address baseRegistrarAddress = vm.envAddress("BASE_REGISTRAR");
        address priceOracleAddress = vm.envAddress("PRICE_ORACLE");

        console.log("Redeploying SELRegistrarController...");
        console.log("Registry:", registryAddress);
        console.log("BaseRegistrar:", baseRegistrarAddress);
        console.log("PriceOracle:", priceOracleAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new controller
        SELRegistrarController controller = new SELRegistrarController(
            ISNSRegistry(registryAddress),
            BaseRegistrar(baseRegistrarAddress),
            IPriceOracle(priceOracleAddress)
        );
        console.log("New SELRegistrarController deployed at:", address(controller));

        // Add controller to BaseRegistrar
        BaseRegistrar registrar = BaseRegistrar(baseRegistrarAddress);
        registrar.addController(address(controller));
        console.log("Added controller to BaseRegistrar");

        vm.stopBroadcast();

        console.log("\n=== UPDATE THESE ADDRESSES ===");
        console.log("SELRegistrarController:", address(controller));
        console.log("MIN_COMMITMENT_AGE: 10 seconds");
        console.log("==============================\n");
    }
}
