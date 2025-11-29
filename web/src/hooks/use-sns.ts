"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from "wagmi";
import {
  keccak256,
  encodePacked,
  encodeAbiParameters,
  toHex,
  type Address,
} from "viem";
import {
  CONTRACT_ADDRESSES,
  SELRegistrarControllerABI,
  PublicResolverABI,
  ReverseRegistrarABI,
  BaseRegistrarABI,
  SNSRegistryABI,
} from "@/lib/contracts";
import {
  namehash,
  removeSuffix,
  SECONDS_PER_YEAR,
  MIN_COMMITMENT_AGE,
} from "@/lib/utils/namehash";

// ============ Types ============

export interface RegistrationParams {
  name: string;
  owner: Address;
  duration: bigint;
  resolver?: Address;
  data?: `0x${string}`[];
  reverseRecord?: boolean;
}

export interface DomainInfo {
  name: string;
  labelhash: `0x${string}`;
  owner: Address;
  expires: bigint;
}

type RegistrationStep =
  | "idle"
  | "committing"
  | "waiting"
  | "registering"
  | "complete"
  | "error";

// ============ useCheckAvailability ============

/**
 * Check if a domain name is available for registration
 */
export function useCheckAvailability(name: string) {
  const nameWithoutSuffix = removeSuffix(name);
  const enabled = nameWithoutSuffix.length >= 3;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SELRegistrarController,
    abi: SELRegistrarControllerABI,
    functionName: "available",
    args: [nameWithoutSuffix],
    query: {
      enabled,
    },
  });

  return {
    available: data ?? false,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useGetPrice ============

/**
 * Get the price for registering a domain
 */
export function useGetPrice(name: string, years: number) {
  const nameWithoutSuffix = removeSuffix(name);
  const duration = BigInt(years) * SECONDS_PER_YEAR;
  const enabled = nameWithoutSuffix.length >= 3 && years > 0;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SELRegistrarController,
    abi: SELRegistrarControllerABI,
    functionName: "rentPrice",
    args: [nameWithoutSuffix, duration],
    query: {
      enabled,
    },
  });

  const [basePrice, premium] = data ?? [BigInt(0), BigInt(0)];

  return {
    basePrice,
    premium,
    total: basePrice + premium,
    duration,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useRegisterDomain ============

/**
 * Register a new domain using commit-reveal scheme
 */
export function useRegisterDomain() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Track the internal step for user-initiated transitions
  const [internalStep, setInternalStep] = useState<RegistrationStep>("idle");
  const [secret, setSecret] = useState<`0x${string}` | null>(null);
  const [commitment, setCommitment] = useState<`0x${string}` | null>(null);
  const [commitTimestamp, setCommitTimestamp] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [registrationParams, setRegistrationParams] =
    useState<RegistrationParams | null>(null);

  // Commit transaction
  const {
    writeContract: writeCommit,
    data: commitTxHash,
    isPending: isCommitPending,
    error: commitError,
  } = useWriteContract();

  // Register transaction
  const {
    writeContract: writeRegister,
    data: registerTxHash,
    isPending: isRegisterPending,
    error: registerError,
  } = useWriteContract();

  // Wait for commit transaction
  const { isLoading: isCommitConfirming, isSuccess: isCommitConfirmed } =
    useWaitForTransactionReceipt({
      hash: commitTxHash,
    });

  // Wait for register transaction
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterConfirmed } =
    useWaitForTransactionReceipt({
      hash: registerTxHash,
    });

  // Derive the actual step from transaction states (pure computation)
  const step: RegistrationStep = (() => {
    if (internalStep === "error") return "error";
    if (isRegisterConfirmed) return "complete";
    if (
      internalStep === "registering" ||
      isRegisterPending ||
      isRegisterConfirming
    )
      return "registering";
    if (isCommitConfirmed || internalStep === "waiting") return "waiting";
    if (internalStep === "committing" || isCommitPending || isCommitConfirming)
      return "committing";
    return internalStep;
  })();

  // Generate a random secret
  const generateSecret = useCallback((): `0x${string}` => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return toHex(randomBytes);
  }, []);

  // Calculate commitment hash (matching contract logic)
  const calculateCommitment = useCallback(
    (params: RegistrationParams, secretValue: `0x${string}`): `0x${string}` => {
      const nameWithoutSuffix = removeSuffix(params.name);
      // This matches the contract's makeCommitment function which uses abi.encode
      const encoded = encodeAbiParameters(
        [
          { type: "string" },
          { type: "address" },
          { type: "uint256" },
          { type: "bytes32" },
          { type: "address" },
          { type: "bytes[]" },
          { type: "bool" },
        ],
        [
          nameWithoutSuffix,
          params.owner,
          params.duration,
          secretValue,
          params.resolver ?? CONTRACT_ADDRESSES.PublicResolver,
          params.data ?? [],
          params.reverseRecord ?? true,
        ]
      );
      return keccak256(encoded);
    },
    []
  );

  // Start the registration process
  const register = useCallback(
    async (params: RegistrationParams) => {
      if (!address) {
        setError(new Error("Wallet not connected"));
        return;
      }

      try {
        setError(null);
        setInternalStep("committing");
        setRegistrationParams(params);
        setCommitTimestamp(null); // Reset timestamp for new registration

        // Generate secret and commitment
        const newSecret = generateSecret();
        setSecret(newSecret);

        const newCommitment = calculateCommitment(params, newSecret);
        setCommitment(newCommitment);

        // Submit commitment
        writeCommit({
          address: CONTRACT_ADDRESSES.SELRegistrarController,
          abi: SELRegistrarControllerABI,
          functionName: "commit",
          args: [newCommitment],
        });
      } catch (err) {
        setError(err as Error);
        setInternalStep("error");
      }
    },
    [address, generateSecret, calculateCommitment, writeCommit]
  );

  // Track when commit is confirmed to set timestamp
  // Using a callback that consumers can call when they detect the waiting state
  const onCommitConfirmed = useCallback(() => {
    if (commitTimestamp === null && isCommitConfirmed) {
      setCommitTimestamp(Date.now());
    }
  }, [commitTimestamp, isCommitConfirmed]);

  // Complete registration after waiting period
  const completeRegistration = useCallback(async () => {
    if (!registrationParams || !secret || step !== "waiting") {
      return;
    }

    // Ensure timestamp is set
    let currentTimestamp = commitTimestamp;
    if (currentTimestamp === null) {
      currentTimestamp = Date.now();
      setCommitTimestamp(currentTimestamp);
    }

    // Check if enough time has passed
    const elapsed = (Date.now() - currentTimestamp) / 1000;
    if (elapsed < MIN_COMMITMENT_AGE) {
      setError(
        new Error(
          `Please wait ${Math.ceil(MIN_COMMITMENT_AGE - elapsed)} more seconds`
        )
      );
      return;
    }

    try {
      setError(null);
      setInternalStep("registering");

      const nameWithoutSuffix = removeSuffix(registrationParams.name);

      // Get the price
      const price = await publicClient?.readContract({
        address: CONTRACT_ADDRESSES.SELRegistrarController,
        abi: SELRegistrarControllerABI,
        functionName: "rentPrice",
        args: [nameWithoutSuffix, registrationParams.duration],
      });

      const [basePrice, premium] = price ?? [BigInt(0), BigInt(0)];
      const totalPrice = basePrice + premium;

      // Add 10% buffer for gas price fluctuations
      const valueWithBuffer = (totalPrice * BigInt(110)) / BigInt(100);

      writeRegister({
        address: CONTRACT_ADDRESSES.SELRegistrarController,
        abi: SELRegistrarControllerABI,
        functionName: "register",
        args: [
          nameWithoutSuffix,
          registrationParams.owner,
          registrationParams.duration,
          secret,
          registrationParams.resolver ?? CONTRACT_ADDRESSES.PublicResolver,
          registrationParams.data ?? [],
          registrationParams.reverseRecord ?? true,
        ],
        value: valueWithBuffer,
      });
    } catch (err) {
      setError(err as Error);
      setInternalStep("error");
    }
  }, [
    registrationParams,
    secret,
    step,
    commitTimestamp,
    publicClient,
    writeRegister,
  ]);

  // Sync errors from write hooks
  const currentError =
    error || (commitError as Error | null) || (registerError as Error | null);

  // Calculate remaining wait time using a callback to avoid impure function call during render
  const getRemainingWaitTime = useCallback(() => {
    if (!commitTimestamp) return MIN_COMMITMENT_AGE;
    return Math.max(
      0,
      MIN_COMMITMENT_AGE - (Date.now() - commitTimestamp) / 1000
    );
  }, [commitTimestamp]);

  // Reset the registration state
  const reset = useCallback(() => {
    setInternalStep("idle");
    setSecret(null);
    setCommitment(null);
    setCommitTimestamp(null);
    setError(null);
    setRegistrationParams(null);
  }, []);

  return {
    register,
    completeRegistration,
    reset,
    onCommitConfirmed,
    step,
    secret,
    commitment,
    getRemainingWaitTime,
    isCommitPending,
    isCommitConfirming,
    isRegisterPending,
    isRegisterConfirming,
    commitTxHash,
    registerTxHash,
    error: currentError,
  };
}

// ============ useRenewDomain ============

/**
 * Renew an existing domain
 */
export function useRenewDomain() {
  const publicClient = usePublicClient();

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const renew = useCallback(
    async (name: string, years: number) => {
      const nameWithoutSuffix = removeSuffix(name);
      const duration = BigInt(years) * SECONDS_PER_YEAR;

      // Get the renewal price
      const price = await publicClient?.readContract({
        address: CONTRACT_ADDRESSES.SELRegistrarController,
        abi: SELRegistrarControllerABI,
        functionName: "rentPrice",
        args: [nameWithoutSuffix, duration],
      });

      const [basePrice, premium] = price ?? [BigInt(0), BigInt(0)];
      const totalPrice = basePrice + premium;

      // Add 10% buffer
      const valueWithBuffer = (totalPrice * BigInt(110)) / BigInt(100);

      writeContract({
        address: CONTRACT_ADDRESSES.SELRegistrarController,
        abi: SELRegistrarControllerABI,
        functionName: "renew",
        args: [nameWithoutSuffix, duration],
        value: valueWithBuffer,
      });
    },
    [publicClient, writeContract]
  );

  return {
    renew,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}

// ============ useResolve ============

/**
 * Resolve a .sel name to an address
 */
export function useResolve(name: string) {
  const node = namehash(name);
  const enabled = name.length > 0;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.PublicResolver,
    abi: PublicResolverABI,
    functionName: "addr",
    args: [node],
    query: {
      enabled,
    },
  });

  return {
    address: data as Address | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useReverseResolve ============

/**
 * Resolve an address to a .sel name
 */
export function useReverseResolve(address: string) {
  const enabled = address.length === 42 && address.startsWith("0x");

  // First get the reverse node for the address
  const { data: reverseNode } = useReadContract({
    address: CONTRACT_ADDRESSES.ReverseRegistrar,
    abi: ReverseRegistrarABI,
    functionName: "node",
    args: [address as Address],
    query: {
      enabled,
    },
  });

  // Then get the name from the resolver
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.PublicResolver,
    abi: PublicResolverABI,
    functionName: "name",
    args: [reverseNode as `0x${string}`],
    query: {
      enabled: enabled && !!reverseNode,
    },
  });

  return {
    name: data as string | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useOwnedDomains ============

/**
 * Get domains owned by an address
 * Note: This uses events to find owned domains. For production,
 * consider using a subgraph for better performance.
 */
export function useOwnedDomains(ownerAddress: string) {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const publicClient = usePublicClient();
  const enabled = ownerAddress.length === 42 && ownerAddress.startsWith("0x");

  const fetchDomains = useCallback(async () => {
    if (!enabled || !publicClient) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Transfer events to the owner address from BaseRegistrar
      const transferLogs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.BaseRegistrar,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: true },
          ],
        },
        args: {
          to: ownerAddress as Address,
        },
        fromBlock: "earliest",
        toBlock: "latest",
      });

      // Get unique token IDs owned by the address
      const tokenIds = new Set<bigint>();
      const tokenIdToLastTransfer = new Map<string, Address>();

      // Track all transfers to determine current owner
      const allTransferLogs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.BaseRegistrar,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "tokenId", type: "uint256", indexed: true },
          ],
        },
        fromBlock: "earliest",
        toBlock: "latest",
      });

      // Track the last transfer for each token
      for (const log of allTransferLogs) {
        const tokenId = log.args.tokenId?.toString();
        if (tokenId) {
          tokenIdToLastTransfer.set(tokenId, log.args.to as Address);
        }
      }

      // Filter to only tokens currently owned by the address
      for (const log of transferLogs) {
        const tokenId = log.args.tokenId;
        if (tokenId) {
          const currentOwner = tokenIdToLastTransfer.get(tokenId.toString());
          if (currentOwner?.toLowerCase() === ownerAddress.toLowerCase()) {
            tokenIds.add(tokenId);
          }
        }
      }

      // Get domain info for each token
      const domainInfos: DomainInfo[] = [];

      for (const tokenId of tokenIds) {
        try {
          // Get expiration
          const expires = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.BaseRegistrar,
            abi: BaseRegistrarABI,
            functionName: "nameExpires",
            args: [tokenId],
          });

          // Token ID is the labelhash
          const labelHashHex = toHex(tokenId, { size: 32 });

          domainInfos.push({
            name: `${tokenId.toString()}.sel`, // TODO: Reverse lookup actual name
            labelhash: labelHashHex,
            owner: ownerAddress as Address,
            expires: expires as bigint,
          });
        } catch {
          // Skip tokens that fail to load
          console.warn(`Failed to load domain info for token ${tokenId}`);
        }
      }

      setDomains(domainInfos);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, ownerAddress, publicClient]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return {
    domains,
    isLoading,
    error,
    refetch: fetchDomains,
  };
}

// ============ useGetOwner ============

/**
 * Get the owner of a domain
 */
export function useGetOwner(name: string) {
  const node = namehash(name);
  const enabled = name.length > 0;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SNSRegistry,
    abi: SNSRegistryABI,
    functionName: "owner",
    args: [node],
    query: {
      enabled,
    },
  });

  return {
    owner: data as Address | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useGetResolver ============

/**
 * Get the resolver address for a domain
 */
export function useGetResolver(name: string) {
  const node = namehash(name);
  const enabled = name.length > 0;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SNSRegistry,
    abi: SNSRegistryABI,
    functionName: "resolver",
    args: [node],
    query: {
      enabled,
    },
  });

  return {
    resolver: data as Address | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useGetTextRecord ============

/**
 * Get a text record for a domain
 */
export function useGetTextRecord(name: string, key: string) {
  const node = namehash(name);
  const enabled = name.length > 0 && key.length > 0;

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.PublicResolver,
    abi: PublicResolverABI,
    functionName: "text",
    args: [node, key],
    query: {
      enabled,
    },
  });

  return {
    value: data as string | undefined,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
    refetch,
  };
}

// ============ useSetPrimaryName ============

/**
 * Set the primary name (reverse record) for the connected wallet
 */
export function useSetPrimaryName() {
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setPrimaryName = useCallback(
    (name: string) => {
      writeContract({
        address: CONTRACT_ADDRESSES.ReverseRegistrar,
        abi: ReverseRegistrarABI,
        functionName: "setName",
        args: [name],
      });
    },
    [writeContract]
  );

  return {
    setPrimaryName,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError as Error | null,
  };
}
