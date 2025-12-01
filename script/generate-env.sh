#!/bin/bash
# Generate .env.local for web app from deployment JSON
# Usage: ./script/generate-env.sh [testnet|mainnet]

set -e

NETWORK=${1:-testnet}
DEPLOYMENT_FILE="deployments/${NETWORK}.json"

if [ ! -f "$DEPLOYMENT_FILE" ]; then
    echo "Error: $DEPLOYMENT_FILE not found"
    exit 1
fi

echo "Generating web/.env.local from $DEPLOYMENT_FILE..."

# Extract addresses using jq
SNS_REGISTRY=$(jq -r '.contracts.SNSRegistry' "$DEPLOYMENT_FILE")
CONTROLLER=$(jq -r '.contracts.SELRegistrarController' "$DEPLOYMENT_FILE")
RESOLVER=$(jq -r '.contracts.PublicResolver' "$DEPLOYMENT_FILE")
ORACLE=$(jq -r '.contracts.PriceOracle' "$DEPLOYMENT_FILE")
REVERSE=$(jq -r '.contracts.ReverseRegistrar' "$DEPLOYMENT_FILE")
BASE=$(jq -r '.contracts.BaseRegistrar' "$DEPLOYMENT_FILE")

# Read existing WalletConnect ID if present
WALLET_CONNECT_ID=""
if [ -f "web/.env.local" ]; then
    WALLET_CONNECT_ID=$(grep "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID" web/.env.local | cut -d'=' -f2 || echo "")
fi
WALLET_CONNECT_ID=${WALLET_CONNECT_ID:-"demo_project_id"}

# Generate .env.local
cat > web/.env.local << EOF
# Generated from $DEPLOYMENT_FILE on $(date)
# Network: $NETWORK

# WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=$WALLET_CONNECT_ID

# SNS Contract Addresses
NEXT_PUBLIC_SNS_REGISTRY=$SNS_REGISTRY
NEXT_PUBLIC_SEL_REGISTRAR_CONTROLLER=$CONTROLLER
NEXT_PUBLIC_PUBLIC_RESOLVER=$RESOLVER
NEXT_PUBLIC_PRICE_ORACLE=$ORACLE
NEXT_PUBLIC_REVERSE_REGISTRAR=$REVERSE
NEXT_PUBLIC_BASE_REGISTRAR=$BASE
EOF

echo "✅ Generated web/.env.local with $NETWORK addresses"
echo ""
cat web/.env.local
