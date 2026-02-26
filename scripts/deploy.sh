#!/bin/bash
# deploy.sh — Deploy all FlowShield contracts to Flow network.
# Usage: ./scripts/deploy.sh [emulator|testnet]

set -e

NETWORK=${1:-testnet}

echo "🛡️  FlowShield Contract Deployment"
echo "   Network: $NETWORK"
echo ""

# Check Flow CLI
if ! command -v flow &> /dev/null; then
  echo "❌ Flow CLI not found. Install: sh -ci \"\$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)\""
  exit 1
fi

echo "📋 Deploying contracts (dependency order):"
echo "   1. ComplianceCredential (core)"
echo "   2. ZKVerifier"
echo "   3. ComplianceAction (depends on ComplianceCredential)"
echo "   4. RuleEngine"
echo "   5. DemoLendingPool (depends on ComplianceAction, ComplianceCredential)"
echo "   6. ComplianceAgent (depends on ComplianceCredential)"
echo ""

flow project deploy --network "$NETWORK" --update

echo ""
echo "✅ All contracts deployed to $NETWORK!"
echo ""

# Show account info
if [ "$NETWORK" = "testnet" ]; then
  echo "📍 Contract address: 0x93c691a98b975493"
  echo "🔍 Verify: https://testnet.flowscan.io/account/0x93c691a98b975493"
fi
