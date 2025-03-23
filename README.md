# NFT Staking Payout System

A decentralized application on the Internet Computer that distributes ICP tokens to users holding NFTs from specific collections.

## Features

- Tracks NFT ownership from two collections
- Calculates and distributes payouts every 5 days
- 10% APY on NFT holdings
- Automatic payout distribution via ICP ledger
- Stable storage for user data and balances

## Prerequisites

- DFX SDK installed
- Internet Computer CLI tools
- Sufficient ICP tokens for deployment and funding

## Deployment

1. Start the local network:
```bash
dfx start --clean --background
```

2. Deploy the canisters:
```bash
dfx deploy
```

3. Fund the payout canister with ICP:
```bash
dfx ledger transfer --amount 1.0 <PAYOUT_CANISTER_ID>
```

## Usage

1. Register for payouts:
```bash
dfx canister call payout register
```

2. Check your NFT count:
```bash
dfx canister call wallet getNFTCount '(<YOUR_PRINCIPAL>)'
```

3. Check your balance:
```bash
dfx canister call wallet getBalance '(<YOUR_PRINCIPAL>)'
```

4. Trigger manual payout (admin only):
```bash
dfx canister call payout processPayouts
```

## Mainnet Deployment

1. Deploy to mainnet:
```bash
dfx deploy --network ic
```

2. Fund the payout canister:
```bash
dfx ledger transfer --network ic --amount 1.0 <PAYOUT_CANISTER_ID>
```

## Architecture

- **Wallet Canister**: Tracks NFT ownership and user balances
- **Payout Canister**: Manages user registration and distributes ICP tokens
- **External Canisters**:
  - NFT Collection 1: `qcg3w-tyaaa-aaaaa-aaaba-cai`
  - NFT Collection 2: `xkbqi-2qaaa-aaaaa-aaaba-cai`
  - ICP Ledger: `ryjl3-tyaaa-aaaaa-aaaba-cai`

## Security Considerations

- Payout canister must be funded with sufficient ICP
- Wallet canister's `updateBalance` function is restricted to payout canister
- All state changes are persisted in stable storage
- Heartbeat mechanism ensures regular payouts

## Development

1. Clone the repository
2. Install dependencies
3. Deploy locally
4. Test functionality
5. Deploy to mainnet

## License

MIT 