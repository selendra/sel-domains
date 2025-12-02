#!/bin/bash
# SNS Snap Publishing Script
# Run this to build and publish the Snap to npm

set -e

echo "🔨 Building SNS Snap..."
npm run build:clean

echo "📦 Publishing to npm..."
npm publish --access public

echo "✅ Published @selendra/sns-snap to npm!"
echo ""
echo "Next steps:"
echo "1. Submit to MetaMask Snaps Directory: https://snaps.metamask.io/submit"
echo "2. Fill in the submission form with:"
echo "   - Name: Selendra Naming Service (SNS)"
echo "   - npm package: @selendra/sns-snap"
echo "   - Description: Resolve .sel domains on Selendra Network"
echo "   - Category: Naming"
