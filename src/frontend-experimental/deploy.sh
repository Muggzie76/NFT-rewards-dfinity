#!/bin/bash

# Build the production version
echo "Building production version..."
npm run build

# Ensure the canister ID is set
export CANISTER_ID=zksib-liaaa-aaaaf-qanva-cai

# Deploy to the IC network
echo "Deploying to IC network..."
dfx deploy --network ic frontend --mode=reinstall --no-wallet

echo "Deployment complete! Visit: https://$CANISTER_ID.ic0.app" 