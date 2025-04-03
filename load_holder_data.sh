#!/bin/bash

# Path to CSV files
GG_CSV_PATH="./holders data/gg-album-release_holders_1743207711480.csv"
DAKU_CSV_PATH="./holders data/daku-motoko_holders_1743207770680.csv"

# Read the CSV files
if [ ! -f "$GG_CSV_PATH" ]; then
    echo "Error: GG Album Release CSV file not found at $GG_CSV_PATH"
    exit 1
fi

if [ ! -f "$DAKU_CSV_PATH" ]; then
    echo "Error: Daku Motoko CSV file not found at $DAKU_CSV_PATH"
    exit 1
fi

GG_CSV_CONTENT=$(cat "$GG_CSV_PATH")
DAKU_CSV_CONTENT=$(cat "$DAKU_CSV_PATH")

echo "CSV files read successfully."
echo "GG Album Release records: $(wc -l < "$GG_CSV_PATH")"
echo "Daku Motoko records: $(wc -l < "$DAKU_CSV_PATH")"

# Prepare the load_csv_data call
echo "Loading CSV data into the wallet canister..."
dfx canister call wallet_rust load_csv_data "(\"$GG_CSV_CONTENT\", \"$DAKU_CSV_CONTENT\")" --network ic

echo "CSV data loaded. Now triggering a payout..."
dfx canister call payout force_payout --network ic

echo "Done!" 