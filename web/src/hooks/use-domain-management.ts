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
