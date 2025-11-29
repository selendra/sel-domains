#!/bin/bash
# Reserve system names for SNS
# These names should be owned by the protocol/team to prevent squatting

set -e

cd /home/user0/projects/selendra-biz/selendra/devtools/sel-domains
source .env

# Contract addresses
CONTROLLER=0xD45c5b8df20Bb0be78e85aeaE56606D385770691
OWNER=0xeC63B36363C4Dc5c3df20c4e46C261C10C4A3DD9
RESOLVER=0x0000000000000000000000000000000000000000
DURATION=31536000  # 1 year

# System names to reserve (short names are expensive!)
NAMES=(
    # Protocol names
    "sel"
    "selendra"
    "sns"
    # Admin names
    "admin"
    "support"
    "help"
    "team"
    # Infrastructure names
    "wallet"
    "swap"
    "bridge"
    "dao"
    "gov"
    "governance"
    # Common reserved
    "test"
    "www"
    "app"
    "api"
    "dev"
)

echo "=== Reserving System Names ==="
echo ""

for NAME in "${NAMES[@]}"; do
    echo "Processing: $NAME.sel"
    
    # Generate random secret
    SECRET=$(cast keccak "$(date +%s)$NAME$RANDOM")
    
    # Get price
    PRICE=$(cast call $CONTROLLER "rentPrice(string,uint256)" "$NAME" $DURATION --rpc-url $TESTNET_RPC 2>&1 | head -1)
    PRICE_DECIMAL=$(echo $PRICE | xargs printf "%d\n" 2>/dev/null | head -1)
    PRICE_SEL=$(echo "scale=2; $PRICE_DECIMAL / 1000000000000000000" | bc)
    echo "  Price: $PRICE_SEL SEL"
    
    # Make commitment
    echo "  Making commitment..."
    COMMITMENT=$(cast call $CONTROLLER "makeCommitment(string,address,uint256,bytes32,address,bytes[],bool)" \
        "$NAME" $OWNER $DURATION $SECRET $RESOLVER "[]" false \
        --rpc-url $TESTNET_RPC)
    
    # Submit commitment
    TX=$(cast send $CONTROLLER "commit(bytes32)" $COMMITMENT \
        --rpc-url $TESTNET_RPC \
        --private-key $PRIVATE_KEY \
        --legacy \
        --gas-price 100000000 \
        --gas-limit 100000 \
        --json 2>&1)
    
    STATUS=$(echo $TX | jq -r '.status // "error"' 2>/dev/null || echo "error")
    if [ "$STATUS" != "0x1" ]; then
        echo "  ⚠️  Commitment failed or already exists, skipping..."
        continue
    fi
    echo "  Commitment submitted"
    
    # Wait for commitment to mature
    echo "  Waiting 65 seconds..."
    sleep 65
    
    # Register
    echo "  Registering..."
    TX=$(cast send $CONTROLLER "register(string,address,uint256,bytes32,address,bytes[],bool)" \
        "$NAME" $OWNER $DURATION $SECRET $RESOLVER "[]" false \
        --rpc-url $TESTNET_RPC \
        --private-key $PRIVATE_KEY \
        --legacy \
        --gas-price 100000000 \
        --gas-limit 500000 \
        --value $PRICE_DECIMAL \
        --json 2>&1)
    
    STATUS=$(echo $TX | jq -r '.status // "error"' 2>/dev/null || echo "error")
    if [ "$STATUS" == "0x1" ]; then
        echo "  ✅ Registered: $NAME.sel"
    else
        echo "  ❌ Registration failed for $NAME.sel"
    fi
    
    echo ""
done

echo "=== Done ==="
