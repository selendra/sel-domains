import { keccak256, encodePacked, stringToHex } from "viem";

/**
 * Calculate the ENS-style namehash for a domain
 * @param name The domain name (e.g., "alice.sel" or "alice")
 * @returns The namehash as a hex string
 */
export function namehash(name: string): `0x${string}` {
  // Normalize the name
  const normalizedName = normalizeName(name);

  // Empty name returns zero hash
  if (!normalizedName) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }

  // Split into labels and process from right to left
  const labels = normalizedName.split(".");

  // Start with zero hash
  let node: `0x${string}` =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Process labels from right to left (e.g., for "alice.sel": first "sel", then "alice")
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i];
    if (label) {
      const labelHash = keccak256(stringToHex(label));
      node = keccak256(encodePacked(["bytes32", "bytes32"], [node, labelHash]));
    }
  }

  return node;
}

/**
 * Calculate the labelhash (keccak256 of a single label)
 * @param label The label without dots (e.g., "alice")
 * @returns The labelhash as a hex string
 */
export function labelhash(label: string): `0x${string}` {
  return keccak256(stringToHex(label.toLowerCase()));
}

/**
 * Normalize a domain name
 * - Convert to lowercase
 * - Remove leading/trailing whitespace
 * - Add .sel suffix if not present
 * @param name The domain name
 * @returns Normalized name with .sel suffix
 */
export function normalizeName(name: string): string {
  const trimmed = name.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  return ensureSuffix(trimmed);
}

/**
 * Add .sel suffix if not already present
 * @param name The domain name
 * @returns Name with .sel suffix
 */
export function ensureSuffix(name: string): string {
  const trimmed = name.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  if (trimmed.endsWith(".sel")) {
    return trimmed;
  }

  return `${trimmed}.sel`;
}

/**
 * Remove .sel suffix if present
 * @param name The domain name
 * @returns Name without .sel suffix
 */
export function removeSuffix(name: string): string {
  const trimmed = name.trim().toLowerCase();

  if (trimmed.endsWith(".sel")) {
    return trimmed.slice(0, -4);
  }

  return trimmed;
}

/**
 * Check if a name is valid for registration
 * @param name The name to check (without .sel suffix)
 * @returns Whether the name is valid
 */
export function isValidName(name: string): boolean {
  const label = removeSuffix(name);

  // Minimum 3 characters
  if (label.length < 3) return false;

  // Maximum 63 characters (DNS label limit)
  if (label.length > 63) return false;

  // For names 3+ chars, no leading/trailing hyphens
  if (label.length >= 3) {
    if (label.startsWith("-") || label.endsWith("-")) {
      return false;
    }
  }

  // Only alphanumeric and hyphens allowed
  return /^[a-z0-9-]+$/.test(label);
}

/**
 * Get the parent node namehash
 * For .sel domains, this is the namehash of "sel"
 */
export const SEL_NODE = namehash("sel");

/**
 * Constants for common operations
 */
export const SECONDS_PER_YEAR = BigInt(31536000);
export const MIN_COMMITMENT_AGE = 10; // 10 seconds (Selendra has 1s blocks)
export const MAX_COMMITMENT_AGE = 86400; // 24 hours in seconds
