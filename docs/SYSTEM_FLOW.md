# World 8 Staking System: Wallet-Payout Interaction Flow

The World 8 NFT Staking System operates through an interaction between the wallet_rust and payout canisters where the wallet canister queries external NFT collections to determine holdings, and the payout canister distributes rewards based on this data. Here's the actual process flow:

## Core Interaction Flow

1. **NFT Holder Information Collection (wallet_rust Canister)**
   - The wallet_rust canister queries two external NFT collections: "GG Album Release" and "Daku Motokos"
   - It retrieves NFT holder data from these canisters using their principal IDs
   - For each holder, it tracks the count of NFTs they own in each collection
   - This data is stored in a HolderInfo structure with daku_count, gg_count, and total_count fields

2. **Holder Data Retrieval (payout Canister)**
   - The payout canister calls wallet.get_all_holders() to retrieve the list of all NFT holders
   - This gives the payout canister a complete list of principals and their NFT counts
   - No CSV format is actually involved - the data is transferred directly between canisters

3. **Payout Processing**
   - The payout canister processes rewards in batches of 10 holders at a time (BATCH_SIZE = 10)
   - For each holder, it calculates rewards based on a 10% APY formula
   - The system uses ZOMB tokens as the reward currency
   - Payouts happen every 5 days (PAYOUT_INTERVAL = 432_000_000_000_000 nanoseconds)

4. **Token Transfer**
   - The payout canister uses the ICRC-1 token standard to transfer ZOMB tokens
   - It calls iczombies.icrc1_transfer() for each holder
   - Failed transfers are tracked and retried up to MAX_RETRIES times
   - Detailed metrics are maintained about successful and failed transfers

5. **System Monitoring**
   - The payout canister implements health checks (get_health())
   - Memory usage is tracked using the update_memory_stats_test() function
   - Statistics are maintained for holders, payouts, and system performance (get_stats())

## Technical Implementation Details

- The wallet_rust canister is implemented in Rust and automatically queries external NFT canisters
- The wallet provides fallback data for testing with predefined NFT counts for certain principals
- The payout canister includes various safeguards (balance checks, admin functions like emergencyReset())
- Memory management includes tracking current usage, peak usage, and usage history
- The system waits for a BATCH_INTERVAL (60 seconds) between processing batches to avoid overloading
- Dynamic fee calculation ensures optimal network fee usage during token transfers

The key point is that there is no manual staking or registration process - the wallet_rust canister automatically tracks NFT ownership by calling external canisters, and the payout canister uses this data to calculate and distribute rewards. 