/**
 * Selendra Naming Service (SNS) MetaMask Snap
 *
 * This Snap enables .sel domain resolution in MetaMask for the Selendra network.
 * It implements the onNameLookup handler to resolve .sel domains to wallet addresses.
 */

import type { OnNameLookupHandler } from "@metamask/snaps-sdk";
import {
    keccak256,
    encodePacked,
    createPublicClient,
    http,
    type Address,
    type Hex,
} from "viem";

// ============================================================================
// Constants
// ============================================================================

// Chain configurations
const SELENDRA_MAINNET_CHAIN_ID = "eip155:1961";
const SELENDRA_TESTNET_CHAIN_ID = "eip155:1953";

// RPC URLs
const RPC_URLS: Record<string, string> = {
    [SELENDRA_MAINNET_CHAIN_ID]: "https://rpc.selendra.org",
    [SELENDRA_TESTNET_CHAIN_ID]: "https://rpc-testnet.selendra.org",
};

// Contract addresses per chain
const REGISTRY_ADDRESSES: Record<string, Address> = {
    // Mainnet - to be filled after deployment
    [SELENDRA_MAINNET_CHAIN_ID]: "0x0000000000000000000000000000000000000000",
    // Testnet
    [SELENDRA_TESTNET_CHAIN_ID]: "0x03BB6Dd5756774bdcC7D5BF6c5EF6Ea28E21A22a",
};

// EIP-137 compliant resolver addresses (MultiChainResolver)
const RESOLVER_ADDRESSES: Record<string, Address> = {
    // Mainnet - to be filled after deployment
    [SELENDRA_MAINNET_CHAIN_ID]: "0x0000000000000000000000000000000000000000",
    // Testnet
    [SELENDRA_TESTNET_CHAIN_ID]: "0x39f8bB3627d84092572304Ed01f1532855775207",
};

// Root node (bytes32(0))
const ROOT_NODE: Hex =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

// ============================================================================
// ABIs
// ============================================================================

const REGISTRY_ABI = [
    {
        name: "resolver",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "node", type: "bytes32" }],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "owner",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "node", type: "bytes32" }],
        outputs: [{ name: "", type: "address" }],
    },
] as const;

const RESOLVER_ABI = [
    // EIP-137: addr(bytes32)
    {
        name: "addr",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "node", type: "bytes32" }],
        outputs: [{ name: "", type: "address" }],
    },
    // EIP-2304: addr(bytes32, uint256) for multichain
    {
        name: "addr",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "node", type: "bytes32" },
            { name: "coinType", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bytes" }],
    },
    // EIP-181: name(bytes32) for reverse resolution
    {
        name: "name",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "node", type: "bytes32" }],
        outputs: [{ name: "", type: "string" }],
    },
] as const;

// ============================================================================
// Namehash Implementation (EIP-137)
// ============================================================================

/**
 * Computes the namehash of a domain name according to EIP-137
 * namehash("") = bytes32(0)
 * namehash("alice.sel") = keccak256(namehash("sel"), keccak256("alice"))
 */
function namehash(name: string): Hex {
    if (!name) {
        return ROOT_NODE;
    }

    const labels = name.toLowerCase().split(".");
    let node: Hex = ROOT_NODE;

    for (let i = labels.length - 1; i >= 0; i--) {
        const labelHash = keccak256(encodePacked(["string"], [labels[i]]));
        node = keccak256(encodePacked(["bytes32", "bytes32"], [node, labelHash]));
    }

    return node;
}

/**
 * Computes the reverse node for an address
 * e.g., for 0x1234...5678, returns namehash("1234...5678.addr.reverse")
 */
function reverseNode(address: string): Hex {
    const addrWithoutPrefix = address.toLowerCase().replace("0x", "");
    return namehash(`${addrWithoutPrefix}.addr.reverse`);
}

// ============================================================================
// Resolution Functions
// ============================================================================

/**
 * Resolves a .sel domain to an address
 */
async function resolveDomain(
    domain: string,
    chainId: string
): Promise<Address | null> {
    const rpcUrl = RPC_URLS[chainId];
    const registryAddress = REGISTRY_ADDRESSES[chainId];

    if (!rpcUrl || !registryAddress) {
        console.log(`Unsupported chain: ${chainId}`);
        return null;
    }

    // Skip if mainnet is not deployed
    if (registryAddress === "0x0000000000000000000000000000000000000000") {
        console.log(`Chain ${chainId} contracts not yet deployed`);
        return null;
    }

    try {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        // Compute namehash for the domain
        const node = namehash(domain);
        console.log(`Resolving domain: ${domain}, node: ${node}`);

        // First, get the resolver from the registry
        const resolverAddress = (await client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "resolver",
            args: [node],
        })) as Address;

        console.log(`Resolver for ${domain}: ${resolverAddress}`);

        // Check if resolver is set
        if (
            !resolverAddress ||
            resolverAddress === "0x0000000000000000000000000000000000000000"
        ) {
            console.log(`No resolver set for ${domain}`);
            return null;
        }

        // Call addr(bytes32) on the resolver - EIP-137
        const address = (await client.readContract({
            address: resolverAddress,
            abi: RESOLVER_ABI,
            functionName: "addr",
            args: [node],
        })) as Address;

        console.log(`Address for ${domain}: ${address}`);

        // Check if address is set
        if (!address || address === "0x0000000000000000000000000000000000000000") {
            console.log(`No address set for ${domain}`);
            return null;
        }

        return address;
    } catch (error) {
        console.error(`Error resolving domain ${domain}:`, error);
        return null;
    }
}

/**
 * Performs reverse resolution: address -> domain name
 */
async function resolveAddress(
    address: string,
    chainId: string
): Promise<string | null> {
    const rpcUrl = RPC_URLS[chainId];
    const registryAddress = REGISTRY_ADDRESSES[chainId];

    if (!rpcUrl || !registryAddress) {
        return null;
    }

    // Skip if contracts not deployed
    if (registryAddress === "0x0000000000000000000000000000000000000000") {
        return null;
    }

    try {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        // Compute the reverse node for this address
        const node = reverseNode(address);
        console.log(`Reverse lookup for ${address}, node: ${node}`);

        // Get the resolver from the registry
        const resolverAddress = (await client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "resolver",
            args: [node],
        })) as Address;

        if (
            !resolverAddress ||
            resolverAddress === "0x0000000000000000000000000000000000000000"
        ) {
            return null;
        }

        // Call name(bytes32) on the resolver - EIP-181
        const name = (await client.readContract({
            address: resolverAddress,
            abi: RESOLVER_ABI,
            functionName: "name",
            args: [node],
        })) as string;

        if (!name) {
            return null;
        }

        // Verify forward resolution matches
        const verifiedAddress = await resolveDomain(name, chainId);
        if (
            verifiedAddress &&
            verifiedAddress.toLowerCase() === address.toLowerCase()
        ) {
            return name;
        }

        return null;
    } catch (error) {
        console.error(`Error in reverse resolution for ${address}:`, error);
        return null;
    }
}

// ============================================================================
// MetaMask Snap Entry Point
// ============================================================================

/**
 * onNameLookup handler for .sel domain resolution
 *
 * This function is called by MetaMask whenever a user types in the send field.
 * It handles both:
 * 1. Forward resolution: domain -> address (e.g., "alice.sel" -> "0x123...")
 * 2. Reverse resolution: address -> domain (e.g., "0x123..." -> "alice.sel")
 */
export const onNameLookup: OnNameLookupHandler = async (request) => {
    const { chainId, address, domain } = request;
    console.log("SNS Snap: onNameLookup called", { chainId, address, domain });

    // Forward resolution: domain -> address
    if (domain) {
        // Only handle .sel domains
        if (!domain.endsWith(".sel")) {
            return null;
        }

        const resolvedAddress = await resolveDomain(domain, chainId);

        if (resolvedAddress) {
            return {
                resolvedAddresses: [
                    {
                        resolvedAddress,
                        protocol: "Selendra Naming Service",
                        domainName: domain,
                    },
                ],
            };
        }
    }

    // Reverse resolution: address -> domain
    if (address) {
        const resolvedDomain = await resolveAddress(address, chainId);

        if (resolvedDomain) {
            return {
                resolvedDomains: [
                    {
                        resolvedDomain,
                        protocol: "Selendra Naming Service",
                    },
                ],
            };
        }
    }

    return null;
};
