import { keccak256, encodePacked, stringToBytes, type Hex } from "viem";

/**
 * Calculate the namehash of a domain
 * @param name Full domain name (e.g., "alice.sel" or "sub.alice.sel")
 * @returns The namehash as a bytes32 hex string
 */
export function namehash(name: string): Hex {
  if (!name) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }

  const labels = name.split(".").reverse();
  let node: Hex =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  for (const label of labels) {
    if (label) {
      const labelHash = keccak256(stringToBytes(label));
      node = keccak256(encodePacked(["bytes32", "bytes32"], [node, labelHash]));
    }
  }

  return node;
}

/**
 * Calculate the labelhash of a single label
 * @param label Single label (e.g., "alice" from "alice.sel")
 * @returns The labelhash as a bytes32 hex string
 */
export function labelhash(label: string): Hex {
  return keccak256(stringToBytes(label));
}

/**
 * Convert a labelhash to token ID (uint256)
 * @param label The label to hash
 * @returns The token ID as bigint
 */
export function labelToTokenId(label: string): bigint {
  return BigInt(labelhash(label));
}

/**
 * Validate a .sel domain name
 * @param name The name to validate (without .sel)
 * @returns true if valid
 */
export function isValidName(name: string): boolean {
  // Must be at least 3 characters
  if (name.length < 3) return false;

  // Must be at most 63 characters (DNS label limit)
  if (name.length > 63) return false;

  // Only lowercase alphanumeric and hyphens
  const validChars = /^[a-z0-9-]+$/;
  if (!validChars.test(name)) return false;

  // No leading or trailing hyphens
  if (name.startsWith("-") || name.endsWith("-")) return false;

  return true;
}

/**
 * Normalize a domain name (lowercase)
 * @param name The domain name
 * @returns Normalized name
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Parse a full domain into label and TLD
 * @param domain Full domain (e.g., "alice.sel")
 * @returns { label, tld }
 */
export function parseDomain(domain: string): { label: string; tld: string } {
  const parts = domain.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid domain format");
  }

  const tld = parts.pop()!;
  const label = parts.join(".");

  return { label, tld };
}

/**
 * Calculate the reverse node for an address
 * @param address The address
 * @returns The reverse node as bytes32
 */
export function reverseNode(address: `0x${string}`): Hex {
  // addr.reverse namehash
  const ADDR_REVERSE_NODE =
    "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2" as Hex;

  // Convert address to lowercase hex string (without 0x)
  const addrHex = address.slice(2).toLowerCase();
  const addrHash = keccak256(stringToBytes(addrHex));

  return keccak256(
    encodePacked(["bytes32", "bytes32"], [ADDR_REVERSE_NODE, addrHash])
  );
}

/**
 * Format a duration in seconds to human-readable string
 * @param seconds Duration in seconds
 * @returns Human-readable duration
 */
export function formatDuration(seconds: bigint): string {
  const days = seconds / 86400n;
  const years = days / 365n;
  const remainingDays = days % 365n;

  if (years > 0n) {
    if (remainingDays > 0n) {
      return `${years} year${years > 1n ? "s" : ""}, ${remainingDays} day${remainingDays > 1n ? "s" : ""}`;
    }
    return `${years} year${years > 1n ? "s" : ""}`;
  }

  return `${days} day${days > 1n ? "s" : ""}`;
}
