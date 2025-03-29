# NFT Holder Data Loading Instructions

This document explains how to use the CSV data loading functionality to populate the wallet canister with NFT holder information from Daku Motoko and GG Album Release collections.

## Overview

The World 8 Staking System allows you to load NFT holder data from CSV files into the wallet_rust canister. This data is then used by the payout canister to calculate and distribute rewards to NFT holders.

## CSV File Format

The system expects two CSV files:

1. **Daku Motoko Holders CSV**: Contains data about Daku Motoko NFT holders
2. **GG Album Release Holders CSV**: Contains data about GG Album Release NFT holders

Both files should follow this format:

```
accountIdentifier,principal,tokenIds,numberOfTokens
<account-id>,<principal-id>,<token-ids>,<count>
```

Where:
- `accountIdentifier`: The account identifier hash
- `principal`: The principal ID of the NFT holder
- `tokenIds`: Semicolon-separated list of token IDs
- `numberOfTokens`: The total number of NFTs owned by the holder

## Loading CSV Data

### Using the Script

1. Place your CSV files in the `holders data` directory:
   ```
   holders data/daku-motoko_holders_1743207770680.csv
   holders data/gg-album-release_holders_1743207711480.csv
   ```

2. Run the data loading script:
   ```bash
   ./scripts/load_holder_data.sh
   ```

The script will:
- Check if the required CSV files exist
- Load the data into the wallet_rust canister
- Update the holder information for processing
- Display statistics about the loaded data

### Manual Loading

If you prefer to load the data manually:

1. Read the contents of the CSV files.
2. Call the `load_csv_data` function on the wallet_rust canister:
   ```bash
   dfx canister call wallet_rust load_csv_data "<daku-csv-content>" "<gg-csv-content>"
   ```

3. Update the holder information:
   ```bash
   dfx canister call wallet_rust update_all_holders
   ```

## Verifying the Data

To verify that the data was loaded correctly:

1. Check if the wallet is using CSV data:
   ```bash
   dfx canister call wallet_rust is_using_csv_data
   ```

2. Check the total number of holders:
   ```bash
   dfx canister call wallet_rust get_total_holders
   ```

3. View the holder information:
   ```bash
   dfx canister call wallet_rust get_all_holders
   ```

## Running the Payout Process

Once the data is loaded, you can process payouts:

```bash
dfx canister call payout processPayouts
```

## Testing the Full Workflow

To test the entire workflow from deployment to payout:

```bash
./scripts/test_workflow.sh
```

This script will:
1. Start a clean DFX replica
2. Deploy all required canisters
3. Load the CSV data
4. Process payouts
5. Verify the results

## Troubleshooting

If you encounter issues:

1. Make sure the CSV files exist in the correct location
2. Verify the format of the CSV data
3. Check that the principal IDs in the CSV are valid
4. Ensure the wallet_rust and payout canisters are deployed
5. Check the canister logs for any error messages 