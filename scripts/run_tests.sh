#!/bin/bash

# Color codes for output formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Canister IDs for testing against production
FRONTEND_CANISTER_ID="zksib-liaaa-aaaaf-qanva-cai"
PAYOUT_CANISTER_ID="zeqfj-qyaaa-aaaaf-qanua-cai"
WALLET_CANISTER_ID="rce3q-iaaaa-aaaap-qpyfa-cai"

# Function to run a test and return 0 if successful, 1 if failed
run_test() {
  local test_name=$1
  echo "Running ${test_name}..."
  
  # Run the test and capture the output
  output=$(dfx canister call test_payout $test_name 2>&1)
  
  # Check if the test failed
  if [[ $? -ne 0 ]]; then
    echo -e "${RED}✗ ${test_name} failed${NC}"
    echo "$output"
    return 1
  else
    echo -e "${GREEN}✓ ${test_name} passed${NC}"
    return 0
  fi
}

# Check if we're running locally or against mainnet
if [[ "$1" == "--network=ic" ]]; then
  echo "Running tests against mainnet canisters:"
  echo "  Frontend: ${FRONTEND_CANISTER_ID}"
  echo "  Payout: ${PAYOUT_CANISTER_ID}"
  echo "  Wallet: ${WALLET_CANISTER_ID}"
  NETWORK_FLAG="--network=ic"
else
  echo "Running tests against local canisters"
  NETWORK_FLAG=""
fi

# Check if local replica is running
if [[ -z "$NETWORK_FLAG" ]]; then
  dfx ping > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Starting local replica...${NC}"
    dfx start --background
    sleep 2
  fi
fi

# Deploy the canisters
echo "Deploying canisters..."
dfx deploy $NETWORK_FLAG

# Initialize test counters
passed=0
failed=0
total=0

# List of tests to run
tests=(
  "test_balance_management"
  "test_fee_management"
  "test_batch_processing"
  "test_full_payout_process"
  "test_error_recovery"
  "test_system_under_load"
  "test_system_stress"
  "test_access_control"
  "test_balance_protection"
)

echo "Running tests..."
for test in "${tests[@]}"; do
  run_test $test
  if [ $? -eq 0 ]; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
  fi
  total=$((total + 1))
done

# Calculate success rate
if [ $total -gt 0 ]; then
  success_rate=$(echo "scale=2; ($passed / $total) * 100" | bc)
else
  success_rate="0"
fi

# Print summary
echo ""
echo "Test Summary:"
echo "============="
echo "Total Tests: $total"
echo "Passed: $passed"
echo "Failed: $failed"
echo "Success Rate: ${success_rate}%"

# Exit with appropriate status code
if [ $failed -gt 0 ]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed successfully!${NC}"
  exit 0
fi 