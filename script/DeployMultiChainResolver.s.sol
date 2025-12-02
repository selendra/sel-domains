// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MultiChainResolver.sol";
import "../src/SNSRegistry.sol";

/**
 * @title Deploy MultiChain Resolver
 * @notice Deploys and configures the new MultiChainResolver for SNS
 * 
 * Usage:
 *   REGISTRY=0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a \
 *   forge script script/DeployMultiChainResolver.s.sol:DeployMultiChainResolver \
 *     --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY --legacy
 */
contract DeployMultiChainResolver is Script {
    function run() external {
        // Get existing registry address from environment
        address registryAddr = vm.envAddress("REGISTRY");
        require(registryAddr != address(0), "REGISTRY env var not set");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy new MultiChainResolver
        ISNSRegistry registry = ISNSRegistry(registryAddr);
        MultiChainResolver resolver = new MultiChainResolver(registry);
        
        console.log("MultiChainResolver deployed at:", address(resolver));
        console.log("Registry address:", registryAddr);
        
        vm.stopBroadcast();
        
        // Output for updating configs
        console.log("\n=== Update these addresses in your config ===");
        console.log("NEXT_PUBLIC_PUBLIC_RESOLVER=%s", address(resolver));
    }
}
