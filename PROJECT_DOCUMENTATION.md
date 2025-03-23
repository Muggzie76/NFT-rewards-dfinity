# NFT Staking Payout System Documentation

## Project Overview
A decentralized application on the Internet Computer that distributes ICP tokens to users holding NFTs from two specific collections: Daku Motoko and GG Album Release.

### Key Features
- Tracks NFT ownership from two collections
- Calculates and distributes payouts every 5 days
- 10% APY on NFT holdings
- Automatic payout distribution via ICP ledger
- Stable storage for user data and balances
- Batch processing for efficient payouts
- Caching mechanism for NFT counts

## System Architecture

### Canisters
1. **Wallet Canister** (`rce3q-iaaaa-aaaap-qpyfa-cai`)
   - Tracks NFT ownership
   - Manages user balances
   - Implements caching for NFT counts
   - Restricted balance updates

2. **Payout Canister** (`zeqfj-qyaaa-aaaaf-qanua-cai`)
   - Manages user registration
   - Calculates payouts
   - Handles ICP transfers
   - Implements batch processing

3. **External Canisters**
   - NFT Collection 1: `erfen-7aaaa-aaaap-ahniq-cai` (Daku Motoko)
   - NFT Collection 2: `v6gck-vqaaa-aaaal-qi3sa-cai` (GG Album Release)
   - ICP Ledger: `ryjl3-tyaaa-aaaaa-aaaba-cai`

## Technical Implementation

### Wallet Canister
```motoko
// Key Components
- NFT tracking from two collections
- 5-minute caching for NFT counts
- Stable storage for persistence
- Restricted balance updates
```

### Payout Canister
```motoko
// Key Components
- 5-day payout intervals
- Batch processing (50 users per batch)
- 10% APY calculation
- Automatic heartbeat mechanism
```

## Configuration Parameters

### Payout Settings
- NFT Value: 1,000 units
- APY: 10%
- Payouts per Year: 73 (every 5 days)
- Transfer Fee: 10,000 e8s (0.0001 ICP)
- Batch Size: 50 users

### Caching Settings
- NFT Count Cache: 5 minutes
- Stable Storage Update: Every 5 minutes

## Cycle Usage Analysis

### Monthly Usage (Estimated)
1. **Wallet Canister**: ~26.25B cycles
   - NFT Count Updates: ~25.92B cycles
   - Balance Updates: ~0.3B cycles
   - Query Operations: ~0.03B cycles

2. **Payout Canister**: ~12.091B cycles
   - Payout Processing: ~12B cycles
   - Heartbeat Checks: ~0.086B cycles
   - User Registration: ~0.005B cycles

**Total Monthly Usage**: ~38.341B cycles

## Security Considerations

1. **Access Control**
   - Balance updates restricted to payout canister
   - NFT queries limited to specific collections
   - Stable storage for data persistence

2. **Data Integrity**
   - Caching mechanism for NFT counts
   - Batch processing for payouts
   - Regular stable storage updates

## Development Process

1. **Initial Setup**
   - Created project structure
   - Implemented wallet canister
   - Implemented payout canister
   - Configured canister IDs

2. **Optimization**
   - Implemented caching
   - Added batch processing
   - Optimized storage operations
   - Reduced cycle usage

3. **Testing**
   - Local deployment testing
   - Canister interaction verification
   - Cycle usage optimization

## Deployment Instructions

1. **Local Deployment**
```bash
# Start DFX
dfx start --clean --background

# Deploy canisters
dfx deploy

# Test functionality
dfx canister call payout register
dfx canister call wallet getNFTCount '("$(dfx identity get-principal)")'
dfx canister call wallet getBalance '("$(dfx identity get-principal)")'
dfx canister call payout processPayouts
```

2. **Mainnet Deployment**
```bash
# Deploy to mainnet
dfx deploy --network ic

# Fund payout canister
dfx ledger transfer --network ic --amount 1.0 <PAYOUT_CANISTER_ID>
```

## Usage Guide

1. **User Registration**
```bash
dfx canister call payout register
```

2. **Check NFT Holdings**
```bash
dfx canister call wallet getNFTCount '("$(dfx identity get-principal)")'
```

3. **Check Balance**
```bash
dfx canister call wallet getBalance '("$(dfx identity get-principal)")'
```

4. **Manual Payout Trigger**
```bash
dfx canister call payout processPayouts
```

## Maintenance

1. **Regular Tasks**
   - Monitor cycle usage
   - Check payout execution
   - Verify NFT tracking
   - Review user balances

2. **Emergency Procedures**
   - Manual payout trigger if needed
   - Balance verification
   - NFT count validation

## Future Improvements

1. **Potential Enhancements**
   - Additional NFT collection support
   - Dynamic APY adjustment
   - Enhanced monitoring
   - User dashboard

2. **Optimization Opportunities**
   - Further cycle usage reduction
   - Improved caching strategies
   - Enhanced batch processing

## Support

For technical support or questions:
1. Review the documentation
2. Check canister logs
3. Verify canister interactions
4. Monitor cycle usage

## License

MIT License 