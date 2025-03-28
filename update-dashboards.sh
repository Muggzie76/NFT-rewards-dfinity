#!/bin/bash

# Set terminal colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set canister ID
export CANISTER_ID=zksib-liaaa-aaaaf-qanva-cai

echo -e "${BLUE}=== World 8 Staking Dashboard Deployment Tool ===${NC}"

# Copy dashboard files to the frontend project
echo -e "${YELLOW}Copying dashboard files to frontend project...${NC}"
mkdir -p src/frontend-experimental/public/dashboards
cp world8_dashboard_complete.html src/frontend-experimental/public/dashboards/
cp world8_globe_dashboard.html src/frontend-experimental/public/dashboards/

# Run the deployment script
echo -e "${YELLOW}Running deployment script...${NC}"
cd src/frontend-experimental
bash deploy.sh

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Deployment completed successfully!${NC}"
  echo -e "${BLUE}Dashboard URLs:${NC}"
  echo -e "Main: https://$CANISTER_ID.icp0.io"
  echo -e "Standard Dashboard: https://$CANISTER_ID.icp0.io/dashboards/world8_dashboard_complete.html"
  echo -e "Globe Dashboard: https://$CANISTER_ID.icp0.io/dashboards/world8_globe_dashboard.html"
else
  echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
  exit 1
fi 