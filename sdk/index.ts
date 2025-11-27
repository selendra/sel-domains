import { ethers } from "ethers";

/**
 * SNS JavaScript SDK
 * Provides easy integration with Selendra Naming Service
 */

// ABI fragments for SNS contracts
export const SNS_REGISTRY_ABI = [
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
  "function ttl(bytes32 node) view returns (uint64)",
  "function recordExists(bytes32 node) view returns (bool)",
  "function setOwner(bytes32 node, address owner)",
  "function setResolver(bytes32 node, address resolver)",
  "event Transfer(bytes32 indexed node, address owner)",
  "event NewResolver(bytes32 indexed node, address resolver)",
];

export const PUBLIC_RESOLVER_ABI = [
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
  "function setAddr(bytes32 node, address a)",
  "function setAddr(bytes32 node, uint256 coinType, bytes a)",
  "function text(bytes32 node, string key) view returns (string)",
  "function setText(bytes32 node, string key, string value)",
  "function contenthash(bytes32 node) view returns (bytes)",
  "function setContenthash(bytes32 node, bytes hash)",
  "function name(bytes32 node) view returns (string)",
  "event AddrChanged(bytes32 indexed node, address a)",
  "event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value)",
];

export const REGISTRAR_CONTROLLER_ABI = [
  "function available(string name) view returns (bool)",
  "function rentPrice(string name, uint256 duration) view returns (tuple(uint256 base, uint256 premium))",
  "function makeCommitment(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord) pure returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord) payable",
  "function renew(string name, uint256 duration) payable",
  "event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 baseCost, uint256 premium, uint256 expires)",
  "event NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires)",
];

export const REVERSE_REGISTRAR_ABI = [
  "function setName(string name) returns (bytes32)",
  "function setNameForAddr(address addr, address owner, address resolver, string name) returns (bytes32)",
  "function node(address addr) pure returns (bytes32)",
];

/**
 * Calculate the namehash of a name
 */
export function namehash(name: string): string {
  if (!name) {
    return ethers.ZeroHash;
  }
  
  const labels = name.split(".");
  let node = ethers.ZeroHash;
  
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i].toLowerCase()));
    node = ethers.keccak256(ethers.concat([node, labelHash]));
  }
  
  return node;
}

/**
 * Calculate the labelhash of a label
 */
export function labelhash(label: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(label.toLowerCase()));
}

/**
 * Normalize a name (lowercase, etc.)
 */
export function normalize(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Validate a .sel name
 */
export function isValidName(name: string): boolean {
  // Remove .sel suffix if present
  const label = name.endsWith(".sel") ? name.slice(0, -4) : name;
  
  // Length: 3-63 characters
  if (label.length < 3 || label.length > 63) {
    return false;
  }
  
  // Only lowercase alphanumeric and hyphens
  const valid = /^[a-z0-9-]+$/.test(label);
  if (!valid) return false;
  
  // No leading or trailing hyphens
  if (label.startsWith("-") || label.endsWith("-")) {
    return false;
  }
  
  return true;
}

/**
 * Contract addresses for different networks
 */
export const ADDRESSES = {
  mainnet: {
    chainId: 1961,
    registry: "", // To be filled after deployment
    resolver: "",
    registrarController: "",
    reverseRegistrar: "",
  },
  testnet: {
    chainId: 1953,
    registry: "", // To be filled after deployment
    resolver: "",
    registrarController: "",
    reverseRegistrar: "",
  },
};

/**
 * SNS Client class
 */
export class SNSClient {
  private provider: ethers.Provider;
  private registry: ethers.Contract;
  private defaultResolver: ethers.Contract;
  private controller: ethers.Contract;
  private reverseRegistrar: ethers.Contract;
  
  constructor(
    provider: ethers.Provider,
    addresses: {
      registry: string;
      resolver: string;
      registrarController: string;
      reverseRegistrar: string;
    }
  ) {
    this.provider = provider;
    this.registry = new ethers.Contract(addresses.registry, SNS_REGISTRY_ABI, provider);
    this.defaultResolver = new ethers.Contract(addresses.resolver, PUBLIC_RESOLVER_ABI, provider);
    this.controller = new ethers.Contract(addresses.registrarController, REGISTRAR_CONTROLLER_ABI, provider);
    this.reverseRegistrar = new ethers.Contract(addresses.reverseRegistrar, REVERSE_REGISTRAR_ABI, provider);
  }
  
  /**
   * Resolve a .sel name to an address
   */
  async resolveName(name: string): Promise<string | null> {
    try {
      const normalized = normalize(name);
      if (!normalized.endsWith(".sel")) {
        throw new Error("Name must end with .sel");
      }
      
      const node = namehash(normalized);
      
      // Get the resolver
      const resolverAddr = await this.registry.resolver(node);
      if (resolverAddr === ethers.ZeroAddress) {
        return null;
      }
      
      // Get the address from resolver
      const resolver = new ethers.Contract(resolverAddr, PUBLIC_RESOLVER_ABI, this.provider);
      const addr = await resolver.addr(node);
      
      return addr === ethers.ZeroAddress ? null : addr;
    } catch (error) {
      console.error("Error resolving name:", error);
      return null;
    }
  }
  
  /**
   * Reverse resolve an address to a .sel name
   */
  async lookupAddress(address: string): Promise<string | null> {
    try {
      const reverseNode = namehash(`${address.slice(2).toLowerCase()}.addr.reverse`);
      
      const resolverAddr = await this.registry.resolver(reverseNode);
      if (resolverAddr === ethers.ZeroAddress) {
        return null;
      }
      
      const resolver = new ethers.Contract(resolverAddr, PUBLIC_RESOLVER_ABI, this.provider);
      const name = await resolver.name(reverseNode);
      
      if (!name) return null;
      
      // Verify forward resolution matches
      const forwardAddr = await this.resolveName(name);
      if (forwardAddr?.toLowerCase() !== address.toLowerCase()) {
        return null;
      }
      
      return name;
    } catch (error) {
      console.error("Error looking up address:", error);
      return null;
    }
  }
  
  /**
   * Check if a name is available for registration
   */
  async isAvailable(name: string): Promise<boolean> {
    const label = name.endsWith(".sel") ? name.slice(0, -4) : name;
    return await this.controller.available(label);
  }
  
  /**
   * Get the registration price for a name
   */
  async getPrice(name: string, duration: number): Promise<{ base: bigint; premium: bigint; total: bigint }> {
    const label = name.endsWith(".sel") ? name.slice(0, -4) : name;
    const price = await this.controller.rentPrice(label, duration);
    return {
      base: price.base,
      premium: price.premium,
      total: price.base + price.premium,
    };
  }
  
  /**
   * Get a text record for a name
   */
  async getText(name: string, key: string): Promise<string | null> {
    try {
      const node = namehash(normalize(name));
      const resolverAddr = await this.registry.resolver(node);
      
      if (resolverAddr === ethers.ZeroAddress) {
        return null;
      }
      
      const resolver = new ethers.Contract(resolverAddr, PUBLIC_RESOLVER_ABI, this.provider);
      return await resolver.text(node, key);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Get all common text records for a name
   */
  async getProfile(name: string): Promise<Record<string, string | null>> {
    const commonKeys = ["email", "url", "avatar", "description", "com.twitter", "com.github", "org.telegram"];
    const profile: Record<string, string | null> = {};
    
    for (const key of commonKeys) {
      profile[key] = await this.getText(name, key);
    }
    
    return profile;
  }
  
  /**
   * Create a registration commitment
   */
  async makeCommitment(
    name: string,
    owner: string,
    duration: number,
    secret: string,
    resolver?: string,
    reverseRecord: boolean = true
  ): Promise<string> {
    const label = name.endsWith(".sel") ? name.slice(0, -4) : name;
    const resolverAddr = resolver || await this.defaultResolver.getAddress();
    
    return await this.controller.makeCommitment(
      label,
      owner,
      duration,
      secret,
      resolverAddr,
      [],
      reverseRecord
    );
  }
  
  /**
   * Generate a random secret for commitment
   */
  static generateSecret(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }
}

/**
 * Duration constants
 */
export const DURATION = {
  ONE_YEAR: 365 * 24 * 60 * 60,
  TWO_YEARS: 2 * 365 * 24 * 60 * 60,
  FIVE_YEARS: 5 * 365 * 24 * 60 * 60,
};

/**
 * Coin types for multi-chain addresses
 */
export const COIN_TYPES = {
  SELENDRA: 1961,
  ETH: 60,
  BTC: 0,
  BNB: 714,
  MATIC: 966,
};

export default SNSClient;
