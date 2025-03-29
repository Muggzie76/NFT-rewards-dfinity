#!/bin/bash

# Set colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== World 8 Staking - Project Cleanup ===${NC}"

# Get the root directory of the project
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Clean up temporary files and directories
echo -e "${YELLOW}Removing temporary files and directories...${NC}"
find . -name ".DS_Store" -type f -delete
find . -name "*.log" -type f -delete
rm -rf /tmp/world8-deployment
rm -rf temp_canister

# Clean up build artifacts
echo -e "${YELLOW}Cleaning build artifacts...${NC}"
rm -rf .dfx/local
find . -name "node_modules" -type d -prune -exec echo "Found node_modules: {}" \;
# Uncomment to remove node_modules (can take a long time to reinstall)
# find . -name "node_modules" -type d -prune -exec rm -rf {} \;

echo -e "${YELLOW}Cleaning old deployment files...${NC}"
find . -name "*.gz" -not -path "*/node_modules/*" -not -path "*/\.git/*" -type f -delete

# Organize source directories
echo -e "${YELLOW}Organizing source directories...${NC}"
if [ -d "$ROOT_DIR/src/world8-dashboard-deployment" ] && [ -d "$ROOT_DIR/src/deployment-tools" ]; then
  echo -e "${YELLOW}Consolidating deployment directories...${NC}"
  # Keep files in deployment-tools, mark the old directory as deprecated
  touch "$ROOT_DIR/src/world8-dashboard-deployment/DEPRECATED.md"
  echo "# DEPRECATED DIRECTORY\n\nThis directory has been replaced by src/deployment-tools. Please use that directory instead." > "$ROOT_DIR/src/world8-dashboard-deployment/DEPRECATED.md"
fi

echo -e "${GREEN}Cleanup complete!${NC}"
echo -e "The following directories have been organized:"
echo -e "- Temporary files removed"
echo -e "- Build artifacts cleaned"
echo -e "- Deployment files consolidated"

echo -e "${YELLOW}To remove node_modules directories (saves space but requires reinstall), run:${NC}"
echo -e "${BLUE}find $ROOT_DIR -name \"node_modules\" -type d -prune -exec rm -rf {} \\;${NC}" 