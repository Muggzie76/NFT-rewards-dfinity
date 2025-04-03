# Holder Data Loader Tool

This tool allows you to update NFT holder data directly from the NFT canisters and trigger a payout through the World 8 Staking Dapp.

## Prerequisites

- Node.js (version 14 or higher)
- NPM (comes with Node.js)

## Setup

1. Navigate to this directory:
   ```
   cd src/tools
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

To fetch holder data directly from the NFT canisters and trigger a payout:

```
npm start
```

This will:
1. Check if the wallet canister is using CSV data mode, and disable it if necessary
2. Test connections to the GG Album Release and Daku Motoko canisters
3. Update all holders by fetching data directly from the NFT canisters
4. Trigger a payout through the payout canister
5. Display a summary of the current holders and payout statistics

## NFT Canisters

The tool is configured to connect to the following NFT canisters:
- GG Album Release: `v6gck-vqaaa-aaaal-qi3sa-cai`
- Daku Motoko: `erfen-7aaaa-aaaap-ahniq-cai`

## Troubleshooting

If you encounter authorization issues, you may need to add your identity to the canisters or provide the identity file when creating the agent.

The tool will automatically create an identity file called `identity.json` in the tools directory. This identity is used for all interactions with the Internet Computer.

If you experience connection issues with the NFT canisters, you can check the test results in the console output for debugging information. 