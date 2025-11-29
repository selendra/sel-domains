import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hex,
  getContract,
  encodeFunctionData,
  parseEther,
  keccak256,
  encodePacked,
  stringToBytes,
} from "viem";

import {
  SNSRegistryABI,
  BaseRegistrarABI,
  PublicResolverABI,
  SELRegistrarControllerABI,
  PriceOracleABI,
} from "./abis";

import {
  testnetAddresses,
  mainnetAddresses,
  ROOT_NODE,
  MIN_COMMITMENT_AGE,
  MIN_REGISTRATION_DURATION,
  COIN_TYPES,
} from "./constants";

import {
  namehash,
  labelhash,
  labelToTokenId,
  isValidName,
  normalizeName,
  parseDomain,
} from "./utils";

export type NetworkType = "mainnet" | "testnet";

export interface SNSConfig {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  network?: NetworkType;
  addresses?: {
    SNSRegistry?: Address;
    PublicResolver?: Address;
    BaseRegistrar?: Address;
    PriceOracle?: Address;
    SELRegistrarController?: Address;
  };
}

export interface DomainInfo {
  name: string;
  node: Hex;
  owner: Address;
  resolver: Address;
  expires: bigint;
  isAvailable: boolean;
  isExpired: boolean;
}

export interface PriceInfo {
  base: bigint;
  premium: bigint;
  total: bigint;
}

/**
 * Selendra Naming Service SDK
 */
export class SNS {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private addresses: typeof testnetAddresses;

  constructor(config: SNSConfig) {
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;

    // Use provided addresses or default based on network
    const defaultAddresses =
      config.network === "mainnet" ? mainnetAddresses : testnetAddresses;
    this.addresses = {
      ...defaultAddresses,
      ...config.addresses,
    };
  }

  // ============ Read Functions ============

  /**
   * Check if a name is available for registration
   * @param name The name to check (without .sel)
   */
  async isAvailable(name: string): Promise<boolean> {
    const normalized = normalizeName(name);

    if (!isValidName(normalized)) {
      return false;
    }

    const controller = getContract({
      address: this.addresses.SELRegistrarController,
      abi: SELRegistrarControllerABI,
      client: this.publicClient,
    });

    return controller.read.available([normalized]) as Promise<boolean>;
  }

  /**
   * Get the owner of a domain
   * @param domain Full domain (e.g., "alice.sel")
   */
  async getOwner(domain: string): Promise<Address> {
    const node = namehash(normalizeName(domain));

    const registry = getContract({
      address: this.addresses.SNSRegistry,
      abi: SNSRegistryABI,
      client: this.publicClient,
    });

    return registry.read.owner([node]) as Promise<Address>;
  }

  /**
   * Get the resolver address for a domain
   * @param domain Full domain (e.g., "alice.sel")
   */
  async getResolver(domain: string): Promise<Address> {
    const node = namehash(normalizeName(domain));

    const registry = getContract({
      address: this.addresses.SNSRegistry,
      abi: SNSRegistryABI,
      client: this.publicClient,
    });

    return registry.read.resolver([node]) as Promise<Address>;
  }

  /**
   * Get the address a domain resolves to
   * @param domain Full domain (e.g., "alice.sel")
   */
  async getAddress(domain: string): Promise<Address> {
    const node = namehash(normalizeName(domain));

    const resolver = getContract({
      address: this.addresses.PublicResolver,
      abi: PublicResolverABI,
      client: this.publicClient,
    });

    return resolver.read.addr([node]) as Promise<Address>;
  }

  /**
   * Get a text record for a domain
   * @param domain Full domain (e.g., "alice.sel")
   * @param key The text record key (e.g., "avatar", "url", "com.twitter")
   */
  async getText(domain: string, key: string): Promise<string> {
    const node = namehash(normalizeName(domain));

    const resolver = getContract({
      address: this.addresses.PublicResolver,
      abi: PublicResolverABI,
      client: this.publicClient,
    });

    return resolver.read.text([node, key]) as Promise<string>;
  }

  /**
   * Get the expiry date of a domain
   * @param name The name (without .sel)
   */
  async getExpiry(name: string): Promise<bigint> {
    const tokenId = labelToTokenId(normalizeName(name));

    const registrar = getContract({
      address: this.addresses.BaseRegistrar,
      abi: BaseRegistrarABI,
      client: this.publicClient,
    });

    return registrar.read.nameExpires([tokenId]) as Promise<bigint>;
  }

  /**
   * Get comprehensive domain information
   * @param name The name (without .sel)
   */
  async getDomainInfo(name: string): Promise<DomainInfo> {
    const normalized = normalizeName(name);
    const domain = `${normalized}.sel`;
    const node = namehash(domain);
    const tokenId = labelToTokenId(normalized);

    const [owner, resolver, expires, available] = await Promise.all([
      this.getOwner(domain),
      this.getResolver(domain),
      this.getExpiry(normalized),
      this.isAvailable(normalized),
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isExpired = expires > 0n && expires < now;

    return {
      name: domain,
      node,
      owner,
      resolver,
      expires,
      isAvailable: available,
      isExpired,
    };
  }

  /**
   * Get the registration price for a name
   * @param name The name (without .sel)
   * @param duration Duration in seconds
   */
  async getPrice(name: string, duration: bigint): Promise<PriceInfo> {
    const normalized = normalizeName(name);

    const controller = getContract({
      address: this.addresses.SELRegistrarController,
      abi: SELRegistrarControllerABI,
      client: this.publicClient,
    });

    const [base, premium] = (await controller.read.rentPrice([
      normalized,
      duration,
    ])) as [bigint, bigint];

    return {
      base,
      premium,
      total: base + premium,
    };
  }

  // ============ Write Functions ============

  /**
   * Make a commitment hash for registration
   * @param name The name to register (without .sel)
   * @param owner The owner address
   * @param duration Duration in seconds
   * @param secret A random secret (bytes32)
   * @param resolver The resolver address (optional)
   * @param data Additional resolver data (optional)
   * @param reverseRecord Whether to set reverse record
   */
  async makeCommitment(
    name: string,
    owner: Address,
    duration: bigint,
    secret: Hex,
    resolver: Address = "0x0000000000000000000000000000000000000000",
    data: Hex[] = [],
    reverseRecord: boolean = false
  ): Promise<Hex> {
    const normalized = normalizeName(name);

    const controller = getContract({
      address: this.addresses.SELRegistrarController,
      abi: SELRegistrarControllerABI,
      client: this.publicClient,
    });

    return controller.read.makeCommitment([
      normalized,
      owner,
      duration,
      secret,
      resolver,
      data,
      reverseRecord,
    ]) as Promise<Hex>;
  }

  /**
   * Submit a commitment
   * @param commitment The commitment hash
   */
  async commit(commitment: Hex): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    const controller = getContract({
      address: this.addresses.SELRegistrarController,
      abi: SELRegistrarControllerABI,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return controller.write.commit([commitment], {
      type: "legacy" as any, // Selendra testnet requires legacy transactions
    });
  }

  /**
   * Register a name (must call commit first and wait MIN_COMMITMENT_AGE)
   * @param name The name to register (without .sel)
   * @param owner The owner address
   * @param duration Duration in seconds
   * @param secret The same secret used in commitment
   * @param resolver The resolver address (optional)
   * @param data Additional resolver data (optional)
   * @param reverseRecord Whether to set reverse record
   */
  async register(
    name: string,
    owner: Address,
    duration: bigint,
    secret: Hex,
    resolver?: Address,
    data: Hex[] = [],
    reverseRecord: boolean = false
  ): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    const normalized = normalizeName(name);
    const resolverAddr = resolver || this.addresses.PublicResolver;

    // Get the price
    const { total } = await this.getPrice(normalized, duration);

    const controller = getContract({
      address: this.addresses.SELRegistrarController,
      abi: SELRegistrarControllerABI,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return controller.write.register(
      [normalized, owner, duration, secret, resolverAddr, data, reverseRecord],
      {
        value: total,
        type: "legacy" as any, // Selendra testnet requires legacy transactions
      }
    );
  }

  /**
   * Helper to register a name with automatic commit and wait
   * @param name The name to register (without .sel)
   * @param owner The owner address
   * @param duration Duration in seconds (default: 1 year)
   */
  async registerWithCommit(
    name: string,
    owner: Address,
    duration: bigint = MIN_REGISTRATION_DURATION
  ): Promise<{ commitTx: Hex; registerTx: Hex }> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    // Generate random secret
    const secret = keccak256(
      encodePacked(["address", "uint256"], [owner, BigInt(Date.now())])
    );

    // Make commitment
    const commitment = await this.makeCommitment(
      name,
      owner,
      duration,
      secret,
      this.addresses.PublicResolver
    );

    // Submit commitment
    const commitTx = await this.commit(commitment);

    // Wait for transaction
    await this.publicClient.waitForTransactionReceipt({ hash: commitTx });

    // Wait for minimum commitment age
    console.log("Waiting for commitment age...");
    await new Promise((resolve) =>
      setTimeout(resolve, Number(MIN_COMMITMENT_AGE) * 1000 + 5000)
    );

    // Register
    const registerTx = await this.register(
      name,
      owner,
      duration,
      secret,
      this.addresses.PublicResolver
    );

    return { commitTx, registerTx };
  }

  /**
   * Renew a name registration
   * @param name The name to renew (without .sel)
   * @param duration Additional duration in seconds
   */
  async renew(name: string, duration: bigint): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    const normalized = normalizeName(name);
    const { base } = await this.getPrice(normalized, duration);

    const controller = getContract({
      address: this.addresses.SELRegistrarController,
      abi: SELRegistrarControllerABI,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return controller.write.renew([normalized, duration], {
      value: base,
      type: "legacy" as any,
    });
  }

  /**
   * Set the address a domain resolves to
   * @param domain Full domain (e.g., "alice.sel")
   * @param address The address to set
   */
  async setAddress(domain: string, address: Address): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    const node = namehash(normalizeName(domain));

    const resolver = getContract({
      address: this.addresses.PublicResolver,
      abi: PublicResolverABI,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return resolver.write.setAddr([node, address], {
      type: "legacy" as any,
    });
  }

  /**
   * Set a text record for a domain
   * @param domain Full domain (e.g., "alice.sel")
   * @param key The text record key
   * @param value The text record value
   */
  async setText(domain: string, key: string, value: string): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    const node = namehash(normalizeName(domain));

    const resolver = getContract({
      address: this.addresses.PublicResolver,
      abi: PublicResolverABI,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return resolver.write.setText([node, key, value], {
      type: "legacy" as any,
    });
  }

  /**
   * Transfer a domain to a new owner
   * @param name The name (without .sel)
   * @param to The new owner address
   */
  async transfer(name: string, to: Address): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for write operations");
    }

    const tokenId = labelToTokenId(normalizeName(name));
    const from = this.walletClient.account?.address;

    if (!from) {
      throw new Error("No account connected");
    }

    const registrar = getContract({
      address: this.addresses.BaseRegistrar,
      abi: BaseRegistrarABI,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return registrar.write.transferFrom([from, to, tokenId], {
      type: "legacy" as any,
    });
  }

  // ============ Utilities ============

  /**
   * Generate a random secret for commitment
   */
  generateSecret(): Hex {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return `0x${Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}` as Hex;
  }

  /**
   * Get the namehash for a domain
   */
  namehash(domain: string): Hex {
    return namehash(normalizeName(domain));
  }

  /**
   * Get the labelhash for a label
   */
  labelhash(label: string): Hex {
    return labelhash(normalizeName(label));
  }

  /**
   * Validate a name
   */
  isValidName(name: string): boolean {
    return isValidName(normalizeName(name));
  }
}

export { SNS as default };
