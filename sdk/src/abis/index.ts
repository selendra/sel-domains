import SNSRegistryABI from "./SNSRegistry.json";
import BaseRegistrarABI from "./BaseRegistrar.json";
import PublicResolverABI from "./PublicResolver.json";
import SELRegistrarControllerABI from "./SELRegistrarController.json";
import PriceOracleABI from "./PriceOracle.json";
import ReverseRegistrarABI from "./ReverseRegistrar.json";

export const abis = {
  SNSRegistry: SNSRegistryABI,
  BaseRegistrar: BaseRegistrarABI,
  PublicResolver: PublicResolverABI,
  SELRegistrarController: SELRegistrarControllerABI,
  PriceOracle: PriceOracleABI,
  ReverseRegistrar: ReverseRegistrarABI,
} as const;

export {
  SNSRegistryABI,
  BaseRegistrarABI,
  PublicResolverABI,
  SELRegistrarControllerABI,
  PriceOracleABI,
  ReverseRegistrarABI,
};
