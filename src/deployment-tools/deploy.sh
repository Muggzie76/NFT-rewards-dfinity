#!/bin/bash

# Set colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CANISTER_ID="zksib-liaaa-aaaaf-qanva-cai"
SOURCE_DIR="$(pwd)"
DEPLOYMENT_DIR="/tmp/world8-deployment"

# Suppress warnings for plaintext identity on mainnet
export DFX_WARNING=-mainnet_plaintext_identity

echo -e "${BLUE}=== World 8 Staking Dashboard Deployment ===${NC}"

# Create a temporary deployment directory
echo -e "${YELLOW}Creating deployment directory...${NC}"
rm -rf "$DEPLOYMENT_DIR"
mkdir -p "$DEPLOYMENT_DIR"

# Copy assets to the deployment directory
echo -e "${YELLOW}Copying assets...${NC}"
cp -r "$SOURCE_DIR"/dashboard/* "$DEPLOYMENT_DIR"/
cp "$SOURCE_DIR"/index.html "$DEPLOYMENT_DIR"/

echo -e "${YELLOW}Checking files in deployment directory...${NC}"
ls -la "$DEPLOYMENT_DIR"
echo ""

echo -e "${YELLOW}Setting up the dfx.json file...${NC}"
cp "$SOURCE_DIR"/dfx.json "$DEPLOYMENT_DIR"/

# Change to the deployment directory
cd "$DEPLOYMENT_DIR"

echo -e "${YELLOW}Configuring identity and canister ID...${NC}"
dfx identity use default
export PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: default"
echo "Principal: $PRINCIPAL"

echo -e "${YELLOW}Starting deployment process...${NC}"
# Try to stop the canister first, but continue if it fails
dfx canister --network=ic stop "$CANISTER_ID" || true

# Deploy directly to the existing canister ID
echo -e "${YELLOW}Deploying assets to existing canister $CANISTER_ID...${NC}"

# Check wallet controllers and add current identity if needed
echo -e "${YELLOW}Checking canister controllers...${NC}"
dfx identity list
echo -e "${YELLOW}You may need to use one of these identities:${NC}"
echo -e "${YELLOW}dfx identity use <identity_name>${NC}"
echo -e "${YELLOW}Then run this script again${NC}"

# Show options for deployment
echo -e "${GREEN}To deploy using Node.js upload script:${NC}"
echo -e "${BLUE}cd $SOURCE_DIR && npm install && node upload.js${NC}"

echo -e "${GREEN}Or if you have controller access, use:${NC}"
echo -e "${BLUE}dfx deploy --network=ic --no-wallet $CANISTER_ID --mode=reinstall --argument \"(record {
  allow_raw_access = opt true;
  headers = vec { record { \\\"Access-Control-Allow-Origin\\\"; \\\"*\\\" } };
  max_age = opt 86400
})\" -y${NC}"

echo -e "${GREEN}When deployed, access your site at:${NC}"
echo -e "${BLUE}https://$CANISTER_ID.icp0.io/${NC}"
echo -e "${BLUE}https://$CANISTER_ID.raw.icp0.io/${NC}"
echo -e "${BLUE}https://$CANISTER_ID.icp-api.io/${NC}"