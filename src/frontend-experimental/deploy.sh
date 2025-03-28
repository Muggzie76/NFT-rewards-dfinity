#!/bin/bash

# Set terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure the canister ID is set
export CANISTER_ID=zksib-liaaa-aaaaf-qanva-cai

echo -e "${BLUE}=== World 8 Staking Dashboard Deployment ===${NC}"

# Build the production version
echo -e "${YELLOW}Building production version...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed. Aborting deployment.${NC}"
  exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Verify dist directory contents
echo -e "${YELLOW}Verifying dist contents before deployment...${NC}"
ls -la dist/

# Create a dfx.json file if it doesn't exist
if [ ! -f "dfx.json" ]; then
  echo -e "${YELLOW}Creating dfx.json...${NC}"
  echo '{
    "canisters": {
      "frontend": {
        "frontend": {
          "entrypoint": "src/index.jsx"
        },
        "source": ["dist/"],
        "type": "assets",
        "canister_id": "'$CANISTER_ID'"
      }
    },
    "defaults": {
      "build": {
        "args": "",
        "packtool": ""
      }
    },
    "networks": {
      "ic": {
        "providers": ["https://icp0.io"],
        "type": "persistent"
      }
    },
    "version": 1
  }' > dfx.json
  echo -e "${GREEN}dfx.json created.${NC}"
fi

# Deploy to the IC network
echo -e "${YELLOW}Deploying to IC network...${NC}"
dfx deploy --network ic frontend --mode=upgrade --no-wallet

if [ $? -ne 0 ]; then
  echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
  exit 1
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}Visit: https://$CANISTER_ID.icp0.io${NC}"

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
echo -e "You can check these URLs after a few minutes:"
echo -e "${BLUE}Main page: https://$CANISTER_ID.icp0.io${NC}" 