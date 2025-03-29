# World 8 Staking System

A complete staking system for NFT holders built on the Internet Computer.

## Overview

The World 8 Staking System provides automated token rewards to NFT holders. The system consists of multiple canisters working together:

- **Wallet Canister (Rust)**: Tracks NFT ownership and holder data
- **Payout Canister (Motoko)**: Handles token distribution and payout scheduling
- **Token Canister (Motoko)**: Mock implementation of the ICRC-1 token standard

## Features

- Automatic tracking of NFT holders from multiple collections
- Configurable payout rates based on NFT ownership
- Detailed monitoring and statistics
- Memory and health tracking
- CSV data import support

## Getting Started

### Prerequisites

- [DFX](https://internetcomputer.org/docs/current/developer-tools/install-upgrade-remove) 0.13.0 or higher
- [Node.js](https://nodejs.org/) 14 or higher
- [Rust](https://www.rust-lang.org/tools/install) (for the wallet canister)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Starting the Local Replica

```bash
dfx start --clean --background
```

### Deploying the Canisters

You can deploy all canisters at once using the test workflow script:

```bash
chmod +x ./scripts/test_workflow.sh
./scripts/test_workflow.sh
```

This script will:
1. Start a clean DFX replica
2. Deploy the wallet_rust, test_token, and payout canisters
3. Mint tokens to the payout canister
4. Load test holder data
5. Update canister IDs
6. Process test payouts
7. Display system statistics

### Manual Deployment

Alternatively, you can deploy each canister individually:

```bash
dfx deploy wallet_rust
dfx deploy test_token
dfx deploy payout
```

## Usage

### Managing Holders

The wallet canister can be loaded with holder data in two ways:

1. **Test Data**:
   ```
   dfx canister call wallet_rust load_test_csv_data
   ```

2. **Custom CSV Data**:
   ```
   dfx canister call wallet_rust load_csv_data '("daku_csv_data", "gg_csv_data")'
   ```

### Processing Payouts

To trigger a payout manually:

```
dfx canister call payout processPayouts
```

### Monitoring

Check system statistics:

```
dfx canister call payout get_stats
```

Check system health:

```
dfx canister call payout get_health
```

## Testing

A comprehensive testing workflow is provided in `scripts/test_workflow.sh`. This script tests all aspects of the system:

```bash
./scripts/test_workflow.sh
```

## Dashboard

A monitoring dashboard is available at `src/dashboard/index.html`. To connect it to your local canisters:

1. Update the canister IDs in `src/dashboard/dashboard.js`
2. Serve the dashboard directory with a local HTTP server:
   ```
   npx http-server src/dashboard -o
   ```

## Development Notes

### Key Changes, Problems, and Solutions

This section documents important changes made to the project along with the problems encountered and their solutions.

#### Payout Canister

**Memory Usage Tracking**
- **Problem**: The canister had no way to track memory usage, making it difficult to monitor system health
- **Solution**: Added a comprehensive memory tracking system with history and peak usage statistics
- **Impact**: Enables dashboard visualization of memory trends and early detection of potential issues

**Balance Status Management**
- **Problem**: Balance status checks were inconsistent across different methods
- **Solution**: Standardized balance status with enum types and constants
- **Impact**: Improved reliability of balance alerts and consistent UI status display

**Canister ID Updates**
- **Problem**: Admin restriction prevented testing workflows from updating canister IDs
- **Solution**: Modified the update_canister_ids function to allow testing without admin rights
- **Impact**: Simplified testing process and enabled automated workflows

**Batch Processing**
- **Problem**: Processing all holders at once caused timeouts and unreliable payouts
- **Solution**: Implemented batch processing with detailed statistics tracking
- **Impact**: More reliable payout processing and better monitoring of system performance

#### Dashboard Integration

**Canister Connectivity**
- **Problem**: Hardcoded canister IDs prevented connection to local test environment
- **Solution**: Made canister IDs configurable and added proper fallback to mock data
- **Impact**: Seamless development experience with both local and production environments

**Multiple Default Exports**
- **Problem**: Multiple default exports caused linter errors and potential runtime issues
- **Solution**: Switched to named exports for consistency
- **Impact**: Improved code quality and eliminated linter warnings

**Memory Visualization**
- **Problem**: Dashboard couldn't display memory usage trends
- **Solution**: Added memory chart with history support
- **Impact**: Better visibility into system resource usage and potential issues

#### Testing Scripts

**Token Minting**
- **Problem**: Original workflow lacked token minting which caused payouts to fail
- **Solution**: Added explicit token minting step to the test workflow
- **Impact**: More reliable testing with proper token balances

**CSV Data Loading**
- **Problem**: Direct CSV loading was difficult due to escaping issues
- **Solution**: Implemented a two-phase approach with test data verification
- **Impact**: Simplified testing process with consistent test data

**Canister ID Updates**
- **Problem**: Order of operations was critical but not enforced
- **Solution**: Added explicit step to update canister IDs after deployment
- **Impact**: Eliminated cross-canister communication failures in testing

## License

This project is licensed under the MIT License - see the LICENSE file for details.
