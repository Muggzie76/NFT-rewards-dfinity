#!/bin/bash

# Set terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set the canister ID
export CANISTER_ID=zksib-liaaa-aaaaf-qanva-cai

echo -e "${BLUE}=== World 8 NFT Staking Dashboard Deployment ===${NC}"

# Ensure we're in the frontend directory
cd "$(dirname "$0")/../src/frontend-experimental" || {
    echo -e "${RED}Error: Could not navigate to frontend directory.${NC}"
    exit 1
}

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

# First, stop the canister
echo -e "${YELLOW}Stopping the canister...${NC}"
dfx canister --network ic stop $CANISTER_ID

# Deploy to the IC network
echo -e "${YELLOW}Deploying to IC network...${NC}"
dfx deploy --network ic frontend --mode=upgrade --no-wallet

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
    # Make sure to restart the canister even if deployment failed
    dfx canister --network ic start $CANISTER_ID
    exit 1
fi

# Start the canister
echo -e "${YELLOW}Starting the canister...${NC}"
dfx canister --network ic start $CANISTER_ID

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}Visit: https://$CANISTER_ID.icp0.io${NC}"

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
echo -e "You can check these URLs after a few minutes:"
echo -e "${BLUE}Main dashboard: https://$CANISTER_ID.icp0.io${NC}"

echo -e "${YELLOW}NOTE: You may need to clear your browser cache to see the changes:${NC}"
echo -e "1. Chrome/Edge: Press Ctrl+Shift+Delete, check 'Cached images and files', click Clear data"
echo -e "2. Firefox: Press Ctrl+Shift+Delete, check 'Cache', click Clear Now"
echo -e "3. Safari: Press Command+Option+E" 