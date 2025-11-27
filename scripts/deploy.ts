import { ethers } from "hardhat";

/**
 * Calculate the namehash of a name
 * namehash("alice.sel") = keccak256(namehash("sel"), keccak256("alice"))
 */
export function namehash(name: string): string {
  if (!name) {
    return ethers.ZeroHash;
  }
  
  const labels = name.split(".");
  let node = ethers.ZeroHash;
  
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
    node = ethers.keccak256(ethers.concat([node, labelHash]));
  }
  
  return node;
}

/**
 * Calculate the labelhash (keccak256 of label)
 */
export function labelhash(label: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

/**
 * Common SNS constants
 */
export const SNS_CONSTANTS = {
  // The namehash of "sel"
  SEL_NODE: namehash("sel"),
  
  // The labelhash of "sel"
  SEL_LABELHASH: labelhash("sel"),
  
  // The namehash of "addr.reverse"
  REVERSE_NODE: namehash("addr.reverse"),
  
  // Duration constants (in seconds)
  ONE_YEAR: 365 * 24 * 60 * 60,
  
  // Grace period
  GRACE_PERIOD: 90 * 24 * 60 * 60,
  
  // Minimum commitment age (1 minute)
  MIN_COMMITMENT_AGE: 60,
  
  // Maximum commitment age (24 hours)
  MAX_COMMITMENT_AGE: 24 * 60 * 60,
};

async function main() {
  console.log("🚀 Deploying SNS (Selendra Naming Service) contracts...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "SEL\n");
  
  // 1. Deploy SNS Registry
  console.log("1️⃣  Deploying SNS Registry...");
  const SNSRegistry = await ethers.getContractFactory("SNSRegistry");
  const registry = await SNSRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   SNSRegistry deployed at:", registryAddress);
  
  // 2. Deploy Public Resolver
  console.log("\n2️⃣  Deploying Public Resolver...");
  const PublicResolver = await ethers.getContractFactory("PublicResolver");
  const resolver = await PublicResolver.deploy(registryAddress);
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log("   PublicResolver deployed at:", resolverAddress);
  
  // 3. Deploy Base Registrar
  console.log("\n3️⃣  Deploying Base Registrar (ERC-721)...");
  const BaseRegistrar = await ethers.getContractFactory("BaseRegistrar");
  const baseRegistrar = await BaseRegistrar.deploy(registryAddress, SNS_CONSTANTS.SEL_NODE);
  await baseRegistrar.waitForDeployment();
  const baseRegistrarAddress = await baseRegistrar.getAddress();
  console.log("   BaseRegistrar deployed at:", baseRegistrarAddress);
  
  // 4. Deploy Price Oracle
  console.log("\n4️⃣  Deploying Price Oracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("   PriceOracle deployed at:", priceOracleAddress);
  
  // 5. Deploy Registrar Controller
  console.log("\n5️⃣  Deploying SEL Registrar Controller...");
  const SELRegistrarController = await ethers.getContractFactory("SELRegistrarController");
  const controller = await SELRegistrarController.deploy(
    baseRegistrarAddress,
    priceOracleAddress,
    SNS_CONSTANTS.MIN_COMMITMENT_AGE,
    SNS_CONSTANTS.MAX_COMMITMENT_AGE,
    resolverAddress
  );
  await controller.waitForDeployment();
  const controllerAddress = await controller.getAddress();
  console.log("   SELRegistrarController deployed at:", controllerAddress);
  
  // 6. Deploy Reverse Registrar
  console.log("\n6️⃣  Deploying Reverse Registrar...");
  const ReverseRegistrar = await ethers.getContractFactory("ReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(registryAddress, resolverAddress);
  await reverseRegistrar.waitForDeployment();
  const reverseRegistrarAddress = await reverseRegistrar.getAddress();
  console.log("   ReverseRegistrar deployed at:", reverseRegistrarAddress);
  
  // ==========================================
  // Configure the contracts
  // ==========================================
  console.log("\n⚙️  Configuring contracts...\n");
  
  // Set up the .sel TLD in the registry
  console.log("   Setting up .sel TLD in registry...");
  await registry.setSubnodeOwner(
    ethers.ZeroHash,
    SNS_CONSTANTS.SEL_LABELHASH,
    baseRegistrarAddress
  );
  
  // Set up reverse registrar
  console.log("   Setting up reverse registrar...");
  const reverseLabelhash = labelhash("reverse");
  const addrLabelhash = labelhash("addr");
  
  // Create "reverse" node
  await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabelhash, deployer.address);
  // Create "addr.reverse" node and assign to reverse registrar
  await registry.setSubnodeOwner(namehash("reverse"), addrLabelhash, reverseRegistrarAddress);
  
  // Add controller to base registrar
  console.log("   Adding controller to base registrar...");
  await baseRegistrar.addController(controllerAddress);
  
  // Set the resolver for .sel
  console.log("   Setting resolver for .sel TLD...");
  await baseRegistrar.setResolver(resolverAddress);
  
  // ==========================================
  // Summary
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ SNS Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log(`   SNSRegistry:            ${registryAddress}`);
  console.log(`   PublicResolver:         ${resolverAddress}`);
  console.log(`   BaseRegistrar:          ${baseRegistrarAddress}`);
  console.log(`   PriceOracle:            ${priceOracleAddress}`);
  console.log(`   SELRegistrarController: ${controllerAddress}`);
  console.log(`   ReverseRegistrar:       ${reverseRegistrarAddress}`);
  
  console.log("\n📝 Key Nodes:\n");
  console.log(`   .sel node:              ${SNS_CONSTANTS.SEL_NODE}`);
  console.log(`   addr.reverse node:      ${SNS_CONSTANTS.REVERSE_NODE}`);
  
  console.log("\n💰 Pricing Tiers:\n");
  console.log("   3-character names:      500 SEL/year");
  console.log("   4-character names:      100 SEL/year");
  console.log("   5+ character names:     5 SEL/year");
  console.log("   Multi-year discount:    10% off for 2+ years");
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      SNSRegistry: registryAddress,
      PublicResolver: resolverAddress,
      BaseRegistrar: baseRegistrarAddress,
      PriceOracle: priceOracleAddress,
      SELRegistrarController: controllerAddress,
      ReverseRegistrar: reverseRegistrarAddress,
    },
    nodes: {
      sel: SNS_CONSTANTS.SEL_NODE,
      reverse: SNS_CONSTANTS.REVERSE_NODE,
    },
  };
  
  console.log("\n📁 Deployment info saved to deployments/\n");
  
  return deploymentInfo;
}

main()
  .then((info) => {
    console.log(JSON.stringify(info, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
