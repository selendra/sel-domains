/**
 * Selendra Naming Service (SNS) SDK
 *
 * A TypeScript SDK for interacting with .sel domains on Selendra
 *
 * @example
 * ```typescript
 * import { SNS, selendraTestnet } from '@selendra/sns-sdk'
 * import { createPublicClient, http } from 'viem'
 *
 * const publicClient = createPublicClient({
 *   chain: selendraTestnet,
 *   transport: http(),
 * })
 *
 * const sns = new SNS({ publicClient, network: 'testnet' })
 *
 * // Check if a name is available
 * const available = await sns.isAvailable('alice')
 *
 * // Get domain info
 * const info = await sns.getDomainInfo('alice')
 * ```
 */

// Main SDK class
export { SNS, default } from "./sns";
export type { SNSConfig, DomainInfo, PriceInfo, NetworkType } from "./sns";

// Chain configurations and constants
export {
  selendraMainnet,
  selendraTestnet,
  testnetAddresses,
  mainnetAddresses,
  ROOT_NODE,
  COIN_TYPES,
  GRACE_PERIOD,
  MIN_REGISTRATION_DURATION,
  MIN_COMMITMENT_AGE,
  MAX_COMMITMENT_AGE,
} from "./constants";

// Utility functions
export {
  namehash,
  labelhash,
  labelToTokenId,
  isValidName,
  normalizeName,
  parseDomain,
  reverseNode,
  formatDuration,
} from "./utils";

// ABIs
export {
  abis,
  SNSRegistryABI,
  BaseRegistrarABI,
  PublicResolverABI,
  SELRegistrarControllerABI,
  PriceOracleABI,
  ReverseRegistrarABI,
} from "./abis";
