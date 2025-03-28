#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run a test and check its result
run_test() {
    local test_name=$1
    echo "Running $test_name..."
    if dfx canister call test_payout $test_name; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        return 1
    fi
}

# Start local replica if not running
if ! dfx ping; then
    echo "Starting local replica..."
    dfx start --clean --background
fi

# Deploy canisters
echo "Deploying canisters..."
dfx deploy --network=local

# Initialize test counters
total_tests=0
passed_tests=0

# Run all tests
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
    ((total_tests++))
    if run_test $test; then
        ((passed_tests++))
    fi
done

# Calculate results
failed_tests=$((total_tests - passed_tests))
success_rate=$(( (passed_tests * 100) / total_tests ))

# Print summary
echo
echo "Test Summary:"
echo "============="
echo "Total Tests: $total_tests"
echo -e "${GREEN}Passed: $passed_tests${NC}"
echo -e "${RED}Failed: $failed_tests${NC}"
echo "Success Rate: $success_rate%"

# Exit with appropriate status
if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi 