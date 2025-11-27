import { ethers } from "hardhat";

/**
 * Generate a new wallet for deployment
 * Save the private key securely!
 */
async function main() {
  console.log("🔑 Generating new deployment wallet...\n");

  const wallet = ethers.Wallet.createRandom();

  console.log("=".repeat(60));
  console.log("⚠️  SAVE THESE CREDENTIALS SECURELY!");
  console.log("=".repeat(60));
  console.log("\n📍 Address:", wallet.address);
  console.log("🔐 Private Key:", wallet.privateKey);
  console.log("📝 Mnemonic:", wallet.mnemonic?.phrase);
  console.log("\n" + "=".repeat(60));

  console.log("\n📋 Next steps:");
  console.log("1. Copy the private key (without 0x) to your .env file");
  console.log("2. Get testnet SEL from the faucet");
  console.log("3. Run: npm run deploy:testnet\n");

  console.log("🌐 Testnet Faucet: https://faucet-testnet.selendra.org");
  console.log("🔍 Explorer: https://explorer-testnet.selendra.org\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
