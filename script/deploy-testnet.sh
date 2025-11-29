#!/bin/bash
# SNS Testnet Deployment Script
# Deploys all contracts step by step using forge create

set -e

# Load environment
source .env

# Configuration
RPC_URL="$TESTNET_RPC"
PRIVATE_KEY="$PRIVATE_KEY"
GAS_PRICE="100000000"  # 0.1 gwei

echo "=== SNS Testnet Deployment ==="
echo "RPC: $RPC_URL"
echo ""

# 1. Deploy SNSRegistry
echo "1. Deploying SNSRegistry..."
SNS_REGISTRY=$(forge create src/SNSRegistry.sol:SNSRegistry \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE \
    --broadcast \
    --json | jq -r '.deployedTo')
echo "   SNSRegistry: $SNS_REGISTRY"

# 2. Deploy PublicResolver
echo "2. Deploying PublicResolver..."
PUBLIC_RESOLVER=$(forge create src/PublicResolver.sol:PublicResolver \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE \
    --broadcast \
    --constructor-args $SNS_REGISTRY \
    --json | jq -r '.deployedTo')
echo "   PublicResolver: $PUBLIC_RESOLVER"

# 3. Calculate SEL node hash (namehash("sel"))
# keccak256(abi.encodePacked(bytes32(0), keccak256("sel")))
SEL_NODE="0x33615410d033c123aaa1a299d1f0146097076d2c66488aef392b0659c3722ea3"
echo "   SEL Node: $SEL_NODE"

# 4. Deploy BaseRegistrar
echo "3. Deploying BaseRegistrar..."
BASE_REGISTRAR=$(forge create src/BaseRegistrar.sol:BaseRegistrar \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE \
    --broadcast \
    --constructor-args $SNS_REGISTRY $SEL_NODE \
    --json | jq -r '.deployedTo')
echo "   BaseRegistrar: $BASE_REGISTRAR"

# 5. Deploy PriceOracle
echo "4. Deploying PriceOracle..."
PRICE_ORACLE=$(forge create src/PriceOracle.sol:PriceOracle \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE \
    --broadcast \
    --json | jq -r '.deployedTo')
echo "   PriceOracle: $PRICE_ORACLE"

# 6. Deploy SELRegistrarController
echo "5. Deploying SELRegistrarController..."
CONTROLLER=$(forge create src/SELRegistrarController.sol:SELRegistrarController \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE \
    --broadcast \
    --constructor-args $SNS_REGISTRY $BASE_REGISTRAR $PRICE_ORACLE \
    --json | jq -r '.deployedTo')
echo "   SELRegistrarController: $CONTROLLER"

# 7. Deploy ReverseRegistrar
echo "6. Deploying ReverseRegistrar..."
REVERSE_REGISTRAR=$(forge create src/ReverseRegistrar.sol:ReverseRegistrar \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE \
    --broadcast \
    --constructor-args $SNS_REGISTRY $PUBLIC_RESOLVER \
    --json | jq -r '.deployedTo')
echo "   ReverseRegistrar: $REVERSE_REGISTRAR"

echo ""
echo "=== Setting up TLDs and Permissions ==="

# 8. Create .sel TLD
echo "7. Creating .sel TLD..."
DEPLOYER=$(cast wallet address $PRIVATE_KEY)
cast send $SNS_REGISTRY "setSubnodeOwner(bytes32,bytes32,address)" \
    "0x0000000000000000000000000000000000000000000000000000000000000000" \
    $(cast keccak "sel") \
    $DEPLOYER \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

# 9. Transfer .sel ownership to BaseRegistrar
echo "8. Transferring .sel to BaseRegistrar..."
cast send $SNS_REGISTRY "setOwner(bytes32,address)" \
    $SEL_NODE \
    $BASE_REGISTRAR \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

# 10. Set resolver for .sel
echo "9. Setting resolver for .sel..."
cast send $BASE_REGISTRAR "setResolver(address)" \
    $PUBLIC_RESOLVER \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

# 11. Add controller to BaseRegistrar
echo "10. Adding controller to BaseRegistrar..."
cast send $BASE_REGISTRAR "addController(address)" \
    $CONTROLLER \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

# 12. Set up reverse registrar
echo "11. Setting up reverse registrar..."
REVERSE_NODE=$(cast keccak "reverse")

# Create .reverse TLD
cast send $SNS_REGISTRY "setSubnodeOwner(bytes32,bytes32,address)" \
    "0x0000000000000000000000000000000000000000000000000000000000000000" \
    $REVERSE_NODE \
    $DEPLOYER \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

# Calculate addr.reverse node
REVERSE_TLD_NODE=$(cast keccak "$(echo -n "" | xxd -p)$REVERSE_NODE")
ADDR_LABEL=$(cast keccak "addr")

# Actually need to compute namehash properly for reverse
# namehash("reverse") = keccak256(abi.encodePacked(bytes32(0), keccak256("reverse")))
REVERSE_TLD_NODE="0xa097f6721ce401e757d1223a763fef49b8b5f90bb18567ddb86fd205dff71d34"

echo "12. Creating addr.reverse..."
cast send $SNS_REGISTRY "setSubnodeOwner(bytes32,bytes32,address)" \
    $REVERSE_TLD_NODE \
    $(cast keccak "addr") \
    $DEPLOYER \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

# addr.reverse node
ADDR_REVERSE_NODE="0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2"

echo "13. Transferring addr.reverse to ReverseRegistrar..."
cast send $SNS_REGISTRY "setOwner(bytes32,address)" \
    $ADDR_REVERSE_NODE \
    $REVERSE_REGISTRAR \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price $GAS_PRICE

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo ""
echo "{"
echo "  \"SNSRegistry\": \"$SNS_REGISTRY\","
echo "  \"PublicResolver\": \"$PUBLIC_RESOLVER\","
echo "  \"BaseRegistrar\": \"$BASE_REGISTRAR\","
echo "  \"PriceOracle\": \"$PRICE_ORACLE\","
echo "  \"SELRegistrarController\": \"$CONTROLLER\","
echo "  \"ReverseRegistrar\": \"$REVERSE_REGISTRAR\""
echo "}"
echo ""
echo "Save these addresses to sdk/src/constants.ts and deployments/testnet.json"
