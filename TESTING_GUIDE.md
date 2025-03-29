# World 8 Staking System Testing Guide

This guide explains how to use the testing components of the World 8 Staking System.

## Overview

The World 8 Staking System includes several test modules for comprehensive testing:

1. **Memory Tests** - Tests memory usage patterns and memory management
2. **End-to-End Tests** - Tests complete payout workflow from start to finish
3. **Security Tests** - Tests access control, resource limits, and security aspects
4. **Load Tests** - Tests system performance under high load conditions
5. **Basic Tests** - Simple unit tests for core functionality

## Test Architecture

Each test module is implemented as a separate canister that can be deployed and run independently. The tests are designed to validate different aspects of the system:

```
test/
└── payout/
    ├── memory_test.mo      # Memory tracking and management testing
    ├── e2e_test.mo         # End-to-end workflow testing
    ├── security_test.mo    # Security and access control testing
    ├── load_test.mo        # Performance and load testing
    ├── basic.test.mo       # Simple unit tests
    ├── payout.test.mo      # Tests for payout functionality
    ├── test.mo             # Test utilities
    └── types.mo            # Type definitions for tests
```

## Running Tests

### Deploying Test Canisters

To deploy the test canisters, use the following DFX commands:

```bash
# Deploy memory test canister
dfx deploy memory_test --argument '(principal "your-payout-canister-id")'

# Deploy e2e test canister
dfx deploy e2e_test --argument '(principal "your-payout-canister-id", principal "your-wallet-canister-id", principal "your-token-canister-id")'

# Deploy security test canister
dfx deploy security_test --argument '(principal "your-payout-canister-id")'

# Deploy load test canister
dfx deploy load_test --argument '(principal "your-payout-canister-id")'
```

### Running Memory Tests

The memory test canister tracks memory usage throughout various operations:

```bash
# Run the memory usage growth test
dfx canister call memory_test runMemoryGrowthTest

# Check memory usage after multiple operations
dfx canister call memory_test runOperationMemoryTest

# Get memory test report
dfx canister call memory_test getMemoryUsageReport
```

### Running End-to-End Tests

The E2E test canister validates the entire payout workflow:

```bash
# Run complete end-to-end test
dfx canister call e2e_test runE2ETest

# Generate a detailed report
dfx canister call e2e_test generateTestReport
```

### Running Security Tests

The security test canister checks for access control and resource management:

```bash
# Run all security tests
dfx canister call security_test runAllSecurityTests

# Run specific tests
dfx canister call security_test testAccessControl
dfx canister call security_test testResourceManagement

# Generate security report
dfx canister call security_test generateSecurityReport
```

### Running Load Tests

The load test canister evaluates system performance under stress:

```bash
# Run standard load test
dfx canister call load_test runStandardLoadTest

# Run high-volume load test
dfx canister call load_test runHighVolumeTest

# Get load test results
dfx canister call load_test getLoadTestResults
```

## Test Output Interpretation

### Memory Test Results

Memory test results show:
- Current memory usage in KB
- Peak memory usage in KB
- Memory growth patterns
- Memory efficiency ratings

Example output:
```
{
  test_name = "Memory Growth Test";
  start_memory_kb = 1024;
  peak_memory_kb = 2048;
  memory_growth_kb = 1024;
  operations_performed = 100;
  memory_per_operation = 10.24;
  efficiency_rating = "Good";
}
```

### E2E Test Results

E2E tests provide results for each step in the workflow:
- System health check
- Statistics verification
- Payout processing
- Post-payout verification
- Memory usage check

### Security Test Results

Security tests categorize issues by severity:
- Critical
- High
- Medium
- Low
- Info

Each test provides details about potential vulnerabilities or issues.

### Load Test Results

Load test results include:
- Response times
- Success rates
- Error rates
- System stability metrics
- Throughput statistics

## Monitoring Dashboard

The system includes a monitoring dashboard that visualizes:
- Memory usage over time
- Payout statistics
- System health status
- Performance metrics

To access the dashboard, open `src/dashboard/index.html` in your browser.

## Test Configuration

Tests can be configured by modifying relevant parameters:
- Change the number of test holders
- Adjust payout amounts
- Modify operation counts for load tests
- Configure memory thresholds

## Adding New Tests

To add new tests:
1. Create a new test file in the `test/payout/` directory
2. Define test cases and evaluation criteria
3. Implement the canister interface for running tests
4. Deploy and run the test canister

## Best Practices

- Run memory tests regularly to detect memory leaks
- Perform security tests after major changes
- Use load tests to determine system capacity
- Combine test results for comprehensive system evaluation

## Troubleshooting

Common issues:
- **Test failures due to canister access**: Ensure correct principal IDs
- **Memory test inconsistencies**: Run multiple times to establish baselines
- **E2E test failures**: Check individual step results for specific issues 