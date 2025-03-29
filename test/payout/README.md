# Payout Canister Testing Components

This directory contains testing components for the World 8 Staking System payout canister, specifically focused on load testing and performance measurement.

## Components

### 1. Load Test (`load_test.mo`)

A comprehensive load testing canister that can:
- Generate test holders with configurable stake amounts
- Run configurable load tests (varying number of holders and iterations)
- Measure performance metrics like processing time and memory usage
- Track success rates and failure conditions
- Generate test summary reports

### 2. Type Definitions (`types.mo`)

Contains interface definitions for:
- Load test configuration and results
- Performance metrics
- Payout canister interface for test interaction

## Usage

### Running a Standard Load Test

Deploy the load test canister and run the standard test:

```bash
# Deploy the load test canister
dfx deploy test_payout_load --argument="(principal \"$(dfx canister id payout)\")"

# Run the standard load test
dfx canister call test_payout_load runStandardLoadTest
```

### Running a High Volume Load Test

To test with a larger number of holders:

```bash
# Run with 1000 holders
dfx canister call test_payout_load runHighVolumeLoadTest '(1000)'
```

### Getting Test Results

To view the results of past load tests:

```bash
# Get raw test results
dfx canister call test_payout_load getTestResults

# Get a formatted summary
dfx canister call test_payout_load generateTestSummary
```

## Load Test Configuration

Load tests can be configured with the following parameters:

- `holder_count`: Number of test holders to generate
- `iterations`: Number of test iterations to run
- `amount_per_holder`: Amount of stake per holder
- `description`: Optional description of the test

Example of running a custom load test:

```bash
dfx canister call test_payout_load runLoadTest '(record {
  holder_count = 500;
  iterations = 10;
  amount_per_holder = 2_000;
  description = opt "Custom test with 500 holders";
})'
```

## Integration with Testing Strategy

This load testing framework is part of the broader testing strategy outlined in `/test/TESTING_STRATEGY.md`. It specifically addresses the performance testing requirements, helping to ensure that the payout canister can handle the expected load in production.

The load tests measure key metrics including:
- Processing time for payout operations
- Memory usage patterns
- System reliability under load
- Scalability with increasing holder counts

## Future Improvements

Planned enhancements to the load testing framework:
- Integration with CI/CD pipeline for automated performance regression testing
- Extended metrics collection for more detailed performance analysis
- Stress testing capabilities to identify system breaking points
- Comparative metrics across different canister versions 