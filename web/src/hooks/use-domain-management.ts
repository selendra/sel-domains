"use client";

import { useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { type Address, keccak256, stringToHex } from "viem";
import {
  CONTRACT_ADDRESSES,
  PublicResolverABI,
  BaseRegistrarABI,
  SNSRegistryABI,
} from "@/lib/contracts";
import { namehash, removeSuffix } from "@/lib/utils/namehash";

// ============ useSetAddress ============

/**
 * Set the address record for a domain
 */
export function useSetAddress() {
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setAddress = useCallback(
    (name: string, address: Address) => {
      const node = namehash(name);
      writeContract({
        address: CONTRACT_ADDRESSES.PublicResolver,
        abi: PublicResolverABI,
        functionName: "setAddr",
        args: [node, address],
        type: "legacy" as const,
      });
    },
    [writeContract]
  );

  return {
    setAddress,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}

// ============ useSetTextRecord ============

/**
 * Set a text record for a domain
 */
export function useSetTextRecord() {
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setTextRecord = useCallback(
    (name: string, key: string, value: string) => {
      const node = namehash(name);
      writeContract({
        address: CONTRACT_ADDRESSES.PublicResolver,
        abi: PublicResolverABI,
        functionName: "setText",
        args: [node, key, value],
        type: "legacy" as const,
      });
    },
    [writeContract]
  );

  return {
    setTextRecord,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}

// ============ useTransferDomain ============

/**
 * Transfer a domain to a new owner
 * Uses the BaseRegistrar's safeTransferFrom function
 */
export function useTransferDomain() {
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const transferDomain = useCallback(
    (name: string, from: Address, to: Address) => {
      // The token ID is the labelhash of the name
      const nameWithoutSuffix = removeSuffix(name);
      const tokenId = BigInt(keccak256(stringToHex(nameWithoutSuffix)));

      writeContract({
        address: CONTRACT_ADDRESSES.BaseRegistrar,
        abi: [
          {
            name: "safeTransferFrom",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "from", type: "address" },
              { name: "to", type: "address" },
              { name: "tokenId", type: "uint256" },
            ],
            outputs: [],
          },
        ],
        functionName: "safeTransferFrom",
        args: [from, to, tokenId],
        type: "legacy" as const,
      });
    },
    [writeContract]
  );

  return {
    transferDomain,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}

// ============ useGetDomainExpiry ============

/**
 * Get the expiry date for a domain
 */
export function useGetDomainExpiry(name: string) {
  const nameWithoutSuffix = removeSuffix(name);
  const tokenId = BigInt(keccak256(stringToHex(nameWithoutSuffix)));
  const enabled = nameWithoutSuffix.length >= 3;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.BaseRegistrar,
    abi: BaseRegistrarABI,
    functionName: "nameExpires",
    args: [tokenId],
    query: {
      enabled,
    },
  });

  return {
    expires: data as bigint | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useGetMultipleTextRecords ============

/**
 * Utility type for text records
 */
export interface TextRecords {
  avatar?: string;
  email?: string;
  url?: string;
  description?: string;
  twitter?: string;
  github?: string;
  discord?: string;
  telegram?: string;
}

export const TEXT_RECORD_KEYS = [
  "avatar",
  "email",
  "url",
  "description",
  "com.twitter",
  "com.github",
  "com.discord",
  "org.telegram",
] as const;

export const TEXT_RECORD_LABELS: Record<string, string> = {
  avatar: "Avatar URL",
  email: "Email",
  url: "Website",
  description: "Description",
  "com.twitter": "Twitter",
  "com.github": "GitHub",
  "com.discord": "Discord",
  "org.telegram": "Telegram",
};

// ============ useSetMultiChainAddress ============

/**
 * Set an address for a specific chain (SLIP-44 coin type)
 */
export function useSetMultiChainAddress() {
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setMultiChainAddress = useCallback(
    (name: string, coinType: bigint, addressBytes: `0x${string}`) => {
      const node = namehash(name);
      writeContract({
        address: CONTRACT_ADDRESSES.PublicResolver,
        abi: PublicResolverABI,
        functionName: "setAddr",
        args: [node, coinType, addressBytes],
        type: "legacy" as const,
      });
    },
    [writeContract]
  );

  return {
    setMultiChainAddress,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}

// ============ useGetMultiChainAddress ============

/**
 * Get an address for a specific chain (SLIP-44 coin type)
 */
export function useGetMultiChainAddress(name: string, coinType: bigint) {
  const node = namehash(name);
  const enabled = name.length > 0;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.PublicResolver,
    abi: PublicResolverABI,
    functionName: "addr",
    args: [node, coinType],
    query: {
      enabled,
    },
  });

  return {
    addressBytes: data as `0x${string}` | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useSetResolver ============

/**
 * Update the resolver for a domain in the SNSRegistry
 * This is needed when migrating to a new resolver (e.g., MultiChainResolver)
 */
export function useSetResolver() {
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setResolver = useCallback(
    (name: string, resolverAddress: Address) => {
      const node = namehash(name);
      writeContract({
        address: CONTRACT_ADDRESSES.SNSRegistry,
        abi: SNSRegistryABI,
        functionName: "setResolver",
        args: [node, resolverAddress],
        type: "legacy" as const,
      });
    },
    [writeContract]
  );

  return {
    setResolver,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}

// ============ useIsResolverOutdated ============

/**
 * Check if the domain's resolver is outdated (not the current MultiChainResolver)
 */
export function useIsResolverOutdated(resolverAddress: Address | undefined): boolean {
  if (!resolverAddress) return false;
  const currentResolver = CONTRACT_ADDRESSES.PublicResolver.toLowerCase();
  return resolverAddress.toLowerCase() !== currentResolver;
}
