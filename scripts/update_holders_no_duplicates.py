#!/usr/bin/env python3
import csv
import subprocess
import time
import re

# Paths to CSV files
daku_csv_path = "/Users/jasonmugg/Desktop/World 8 Staking Dapp/daku-motoko_holders_1742878395968.csv"
gg_csv_path = "/Users/jasonmugg/Desktop/World 8 Staking Dapp/gg-album-release_holders_1742878297330.csv"
current_holders_path = "current_holders.txt"

# Extract current holders from wallet canister output
current_holders = set()
try:
    with open(current_holders_path, 'r') as file:
        content = file.read()
        # Extract principals using regex
        principals = re.findall(r'principal "(.*?)"', content)
        current_holders = set(principals)
    print(f"Found {len(current_holders)} holders already in the canister")
except Exception as e:
    print(f"Error reading current holders: {e}")
    current_holders = set()

# Dictionary to hold combined holder data
holders = {}

# Process Daku Motoko holders
print("Processing Daku Motoko holders...")
with open(daku_csv_path, 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        principal = row['principal']
        daku_count = int(row['numberOfTokens'])
        if principal in holders:
            holders[principal]['daku_count'] = daku_count
        else:
            holders[principal] = {'daku_count': daku_count, 'gg_count': 0}

# Process GG Album holders
print("Processing GG Album holders...")
with open(gg_csv_path, 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        principal = row['principal']
        gg_count = int(row['numberOfTokens'])
        if principal in holders:
            holders[principal]['gg_count'] = gg_count
        else:
            holders[principal] = {'daku_count': 0, 'gg_count': gg_count}

# Write the combined data to a file for reference
with open("combined_holders_no_duplicates.csv", 'w') as file:
    writer = csv.writer(file)
    writer.writerow(['principal', 'daku_count', 'gg_count', 'total_count', 'already_in_canister'])
    for principal, counts in holders.items():
        daku_count = counts['daku_count']
        gg_count = counts['gg_count']
        total_count = daku_count + gg_count
        already_in_canister = principal in current_holders
        writer.writerow([principal, daku_count, gg_count, total_count, already_in_canister])

print(f"Combined holder data saved to combined_holders_no_duplicates.csv - {len(holders)} holders total")

# Generate dfx commands to update only new holders
with open("update_commands_no_duplicates.sh", 'w') as file:
    file.write("#!/bin/bash\n\n")
    
    # First, count how many new holders we'll update
    new_holders = [p for p in holders.keys() if p not in current_holders]
    total_new = len(new_holders)
    
    count = 0
    updated = 0
    for principal, counts in holders.items():
        # Skip holders already in the canister
        if principal in current_holders:
            count += 1
            continue
            
        daku_count = counts['daku_count']
        gg_count = counts['gg_count']
        file.write(f'echo "Updating {updated+1}/{total_new} (total progress: {count+1}/{len(holders)}): {principal}"\n')
        file.write(f'dfx canister call wallet_rust set_verified_nft_counts \'(principal "{principal}", {daku_count}, {gg_count})\' --network ic\n')
        file.write('sleep 0.5\n\n')  # Add a small delay between commands
        count += 1
        updated += 1

print(f"Update commands saved to update_commands_no_duplicates.sh")
print(f"Will update {len(holders) - len(current_holders)} new holders (skipping {len(current_holders)} that are already in the canister)")
print("To run the updates, execute: chmod +x update_commands_no_duplicates.sh && ./update_commands_no_duplicates.sh") 