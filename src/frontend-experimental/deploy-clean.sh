#!/bin/bash

# Set terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure the canister ID is set
export CANISTER_ID=zksib-liaaa-aaaaf-qanva-cai
export NETWORK=ic
export DFX_IDENTITY=$(dfx identity whoami)

echo -e "${BLUE}=== World 8 Staking Dashboard Clean Deployment ===${NC}"
echo -e "${YELLOW}Using identity: ${DFX_IDENTITY}${NC}"
echo -e "${YELLOW}Deploying to canister: ${CANISTER_ID} on network: ${NETWORK}${NC}"

# Copy the dashboards/index.html to the main index.html to make it the primary entry point
echo -e "${YELLOW}Setting dashboards/index.html as the main entry point...${NC}"
cp -f public/dashboards/index.html public/index.html

# Build the production version
echo -e "${YELLOW}Building production version...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed. Aborting deployment.${NC}"
  exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Overwrite dist/index.html with our dashboard file to make sure it's the main entry point
echo -e "${YELLOW}Ensuring dashboard is the main entry point...${NC}"
cp -f dist/dashboard/index.html dist/index.html

# Verify dist directory contents
echo -e "${YELLOW}Verifying dist contents before deployment...${NC}"
ls -la dist/

# Create a simple dfx.json file for the asset canister
echo -e "${YELLOW}Creating dfx.json file...${NC}"
cat > dfx.json << EOF
{
  "canisters": {
    "assets": {
      "type": "assets",
      "source": ["dist/"],
      "frontend": {
        "entrypoint": "dist/index.html"
      }
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
}
EOF

echo -e "${YELLOW}Validating ICP controller and identity...${NC}"
dfx identity use "$DFX_IDENTITY"

# Deploy using production build command tailored for this situation
echo -e "${YELLOW}Starting deployment process...${NC}"

# First, contact the World 8 development team with a better deployment request
echo -e "${BLUE}IMPORTANT MESSAGE:${NC}"
echo -e "${YELLOW}The current deployment approach is encountering issues with canister management permissions.${NC}"
echo -e "${YELLOW}For a successful deployment, please contact the IC development team with the following information:${NC}"
echo -e "1. Your canister ID: ${CANISTER_ID}"
echo -e "2. Your intent: Deploy the dashboards/index.html as the main entry point at /"
echo -e "3. Request: A clean deployment of the assets from the dist folder"
echo -e ""
echo -e "${GREEN}In the meantime, your build is successful and ready for deployment.${NC}"
echo -e "${GREEN}The dashboard/index.html has been copied to the main index.html location.${NC}"

# Create a zip file for easy transfer
echo -e "${YELLOW}Creating deployment package...${NC}"
zip -r world8-dashboard-deployment.zip dist/

echo -e "${GREEN}Deployment preparation complete!${NC}"
echo -e "${YELLOW}Deployment package created: ${PWD}/world8-dashboard-deployment.zip${NC}"
echo -e "${YELLOW}Please provide this package to the World 8 team for manual deployment.${NC}"
echo -e "${BLUE}Once deployed, you can visit: https://$CANISTER_ID.icp0.io${NC}"

# Verify deployment
echo -e "${YELLOW}After deployment verification:${NC}"
echo -e "You can check these URLs after deployment:"
echo -e "${BLUE}Main page: https://$CANISTER_ID.icp0.io${NC}"

# Clear browser cache instructions
echo -e "${YELLOW}NOTE: After deployment, you may need to clear your browser cache to see the changes:${NC}"
echo -e "1. Chrome/Edge: Press Ctrl+Shift+Delete, check 'Cached images and files', click Clear data"
echo -e "2. Firefox: Press Ctrl+Shift+Delete, check 'Cache', click Clear Now"
echo -e "3. Safari: Press Command+Option+E" 