# World 8 Staking System: Payout Canister

This document describes the enhanced payout canister implementation for the World 8 NFT Staking System.

## Overview

The payout canister is responsible for distributing ZOMB token rewards to NFT holders. It works in conjunction with the wallet_rust canister, which tracks NFT ownership across the "GG Album Release" and "Daku Motokos" collections.

## Production Deployment

- **Payout Canister ID**: `zeqfj-qyaaa-aaaaf-qanua-cai`
- **Wallet Canister ID**: `rce3q-iaaaa-aaaap-qpyfa-cai`
- **Frontend Canister ID**: `zksib-liaaa-aaaaf-qanva-cai`
- **Token Canister ID**: `rwdg7-ciaaa-aaaam-qczja-cai` (ZOMB token)

## Core Features

### 1. Reward Distribution System
- Automatic 5-day payout schedule
- 10% Annual Percentage Yield for all NFT holders
- Rewards calculated based on NFT count (both collections)
- Batch processing (10 holders per batch) to manage resource usage

### 2. Token Transfer Implementation
- ICRC-1 standard compliant token transfers
- Retry mechanism for failed transfers (up to 3 retries)
- Dynamic fee adjustment based on network conditions
- Tracking of successful and failed transfers

### 3. User Statistics
- Persistent tracking of user/holder statistics
- Data preserved through canister upgrades
- Metrics on NFT counts, payout amounts, and history

### 4. Monitoring and Health Checks
- Memory usage tracking
- Balance alerts for low token balances
- Comprehensive statistics dashboard
- HTTP interface for external monitoring

## Interaction Flow

1. The wallet_rust canister queries external NFT collections to determine holdings
2. The payout canister calls wallet_rust.get_all_holders() to retrieve holder data
3. For each holder with at least one NFT, the payout canister:
   - Calculates rewards based on NFT count and APY formula
   - Updates user statistics
   - Transfers ZOMB tokens to the holder
4. The payout canister notifies the frontend canister of updated statistics
5. The dashboard displays current system status

## Known Issues & Limitations

1. **Principal Conversion**: There's an issue with Principal conversion when attempting to check token balances. A temporary mock balance is used until this is resolved.

2. **Heartbeat Triggers**: The heartbeat automatically checks for due payouts but relies on external calls to actually process them.

3. **Token Balance**: The payout canister requires a sufficient balance of ZOMB tokens to distribute rewards.

## Configuration Parameters

- **PAYOUT_INTERVAL**: 432_000_000_000_000 nanoseconds (5 days)
- **BATCH_SIZE**: 10 holders per batch
- **BATCH_INTERVAL**: 60_000_000_000 nanoseconds (60 seconds) between batches
- **MAX_RETRIES**: 3 attempts for failed transfers
- **APY_PERCENT**: 10 (10% annual yield)
- **BASE_TOKEN_AMOUNT**: 100_000_000 (8 decimal places)
- **LOW_BALANCE_THRESHOLD**: 1_000_000_000 (10 ZOMB tokens)

## Admin Functions

- `force_payout()`: Trigger an immediate payout regardless of schedule
- `set_payout_enabled(enabled: Bool)`: Enable/disable the payout system
- `refresh_token_balance()`: Check and update the current token balance
- `update_config()`: Modify system configuration parameters
- `reset_error_state()`: Clear error messages

## Future Improvements

1. Fix Principal conversion issue to enable real token balance checks
2. Implement more sophisticated reward calculation models
3. Add adaptive batch sizing based on system load
4. Enhance security with role-based access controls
5. Implement detailed analytics for holder engagement

## Maintenance Notes

The canister requires minimal maintenance but should be monitored for:
- Token balance sufficiency
- Successful payout completion
- Memory usage growth
- Error states

## Development Team Notes

All statistics and user data are persisted through upgrades using stable storage. The system has been designed to be resilient to temporary failures and will retry operations as needed. If you need to modify the core payout logic, focus on the processPayouts() function. 