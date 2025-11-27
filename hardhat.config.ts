import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";
const TESTNET_RPC =
  process.env.TESTNET_RPC || "https://rpc-testnet.selendra.org";
const MAINNET_RPC = process.env.MAINNET_RPC || "https://rpc.selendra.org";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1961,
    },
    selendra_testnet: {
      url: TESTNET_RPC,
      chainId: 1961, // Testnet uses same chain ID as mainnet
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    selendra_mainnet: {
      url: MAINNET_RPC,
      chainId: 1961,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      selendra_testnet: "no-api-key-needed",
      selendra_mainnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "selendra_testnet",
        chainId: 1953,
        urls: {
          apiURL: "https://explorer-testnet.selendra.org/api",
          browserURL: "https://explorer-testnet.selendra.org",
        },
      },
      {
        network: "selendra_mainnet",
        chainId: 1961,
        urls: {
          apiURL: "https://explorer.selendra.org/api",
          browserURL: "https://explorer.selendra.org",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    token: "SEL",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
