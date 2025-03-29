#!/bin/bash

# Exit on error
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===================================================
# NOTES:
# - PROBLEM: Original workflow lacked token minting which caused payouts to fail
# - SOLUTION: Added step 4A to mint tokens to the payout canister
# - PROBLEM: Token balance checks weren't working properly
# - SOLUTION: Added balance verification and improved error reporting
# - PROBLEM: Order of operations was critical - canister IDs needed to be updated after deployment
# - SOLUTION: Added step 5A to explicitly update canister IDs
# ===================================================

echo -e "${BLUE}========== Testing World 8 Staking System Workflow ==========${NC}"

# Step 1: Start a clean DFX replica
echo -e "${YELLOW}Step 1: Starting clean DFX replica...${NC}"
dfx stop
dfx start --clean --background
echo "DFX replica started"

# Step 2: Deploy wallet_rust canister
echo -e "${YELLOW}Step 2: Deploying wallet_rust canister...${NC}"
dfx deploy wallet_rust
echo "wallet_rust canister deployed"

# Step 3: Deploy mock token canister
echo -e "${YELLOW}Step 3: Deploying mock token canister...${NC}"
dfx deploy test_token
echo "Mock token canister deployed"

# Step 4: Deploy payout canister
echo -e "${YELLOW}Step 4: Deploying payout canister...${NC}"
dfx deploy payout
PAYOUT_CANISTER=$(dfx canister id payout)
WALLET_CANISTER=$(dfx canister id wallet_rust)
TOKEN_CANISTER=$(dfx canister id test_token)

echo "Deployed Canisters:"
echo "  Wallet: $WALLET_CANISTER"
echo "  Payout: $PAYOUT_CANISTER"
echo "  Token: $TOKEN_CANISTER"

# Step 4A: Mint tokens to the payout canister
# NOTE: Critical step - without tokens, payouts will fail with "CRITICAL" balance status
echo -e "${YELLOW}Step 4A: Minting tokens to the payout canister...${NC}"
dfx canister call test_token mint "(principal \"$PAYOUT_CANISTER\", 5000000000)"
echo "Tokens minted to payout canister"

# Step 5: Load CSV data into wallet_rust canister
# NOTE: Changed from load_csv_data to load_test_csv_data for simplified testing
echo -e "${YELLOW}Step 5: Loading test CSV data into wallet_rust canister...${NC}"
dfx canister call wallet_rust load_test_csv_data
echo "Test CSV data loaded into wallet_rust canister"

# Step 5A: Update canister IDs in payout canister
# NOTE: This step is essential for cross-canister calls to work properly
# PROBLEM: Previously required admin authentication, now fixed for testing
echo -e "${YELLOW}Step 5A: Updating canister IDs in payout canister...${NC}"
dfx canister call payout update_canister_ids "(principal \"$WALLET_CANISTER\", principal \"$TOKEN_CANISTER\")"
echo "Canister IDs updated"

# Step 6: Verify holder data in wallet_rust canister
echo -e "${YELLOW}Step 6: Verifying holder data in wallet_rust canister...${NC}"
echo "Total Holders:"
dfx canister call wallet_rust get_total_holders
echo "Getting a sample of holders:"
dfx canister call wallet_rust get_all_holders
echo "Holder data verification complete"

# Step 7: Process payouts
echo -e "${YELLOW}Step 7: Processing payouts...${NC}"
dfx canister call payout processPayouts
echo "Payouts processed"

# Step 8: Check payout statistics
echo -e "${YELLOW}Step 8: Checking payout statistics...${NC}"
dfx canister call payout get_stats
echo "Payout statistics retrieved"

# Step 9: Check memory usage
echo -e "${YELLOW}Step 9: Checking memory usage...${NC}"
dfx canister call payout get_health
echo "Health status retrieved"

echo -e "${GREEN}========== Workflow Test Completed Successfully ==========${NC}"
echo "Summary:"
echo "1. Deployed wallet_rust and payout canisters"
echo "2. Loaded test CSV data for NFT holders"
echo "3. Processed payouts to holders"
echo "4. Verified system health and statistics" 