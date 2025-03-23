#!/bin/bash

# Source DFX environment
source "$HOME/.local/share/dfx/env"

# Start DFX in background
dfx start --clean --background

# Wait for DFX to start
sleep 5

# Deploy canisters
dfx deploy

# Test user registration
echo "Testing user registration..."
dfx canister call payout register

# Test NFT count check
echo "Testing NFT count check..."
dfx canister call wallet getNFTCount '("$(dfx identity get-principal)")'

# Test balance check
echo "Testing balance check..."
dfx canister call wallet getBalance '("$(dfx identity get-principal)")'

# Test manual payout
echo "Testing manual payout..."
dfx canister call payout processPayouts

# Check final balance
echo "Checking final balance..."
dfx canister call wallet getBalance '("$(dfx identity get-principal)")'

# Stop DFX
dfx stop 