# NFT Staking Payout System

A decentralized application on the Internet Computer that distributes ICP tokens to users holding NFTs from specific collections.

## Recent Updates

### March 2024
- Upgraded wallet canister to new ID: `rce3q-iaaaa-aaaap-qpyfa-cai`
- Added comprehensive test suite for wallet functionality
- Implemented new frontend components for better user experience
- Enhanced error handling and type safety in payout calculations
- Added batch processing optimizations for better performance

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

- **Wallet Canister**: Tracks NFT ownership and user balances (`rce3q-iaaaa-aaaap-qpyfa-cai`)
- **Payout Canister**: Manages user registration and distributes ICP tokens
- **External Canisters**:
  - NFT Collection 1: `qcg3w-tyaaa-aaaaa-aaaba-cai`
  - NFT Collection 2: `xkbqi-2qaaa-aaaaa-aaaba-cai`
  - ICP Ledger: `ryjl3-tyaaa-aaaaa-aaaba-cai`

## NFT Collection Interactions

### Daku Motokos (erfen-7aaaa-aaaap-ahniq-cai)

To check NFT ownership:
```bash
# Primary method - Returns full token metadata
dfx canister --network ic call erfen-7aaaa-aaaap-ahniq-cai getTokens '(principal "<PRINCIPAL_ID>")'
```

The `getTokens` method returns comprehensive NFT metadata including:
- Token IDs
- NFT names (e.g., "Daku Motokos #2343")
- Complete attribute sets (Background, Hands, Bodies, etc.)
- Ownership verification

Note: Other standard methods like `balance`, `tokens`, or `tokens_ext` are not supported by this collection. Always use `getTokens` for ownership verification.

### GG Album Release (v6gck-vqaaa-aaaal-qi3sa-cai)

To check NFT ownership:
```bash
# Primary method - Returns extended token information
dfx canister --network ic call v6gck-vqaaa-aaaal-qi3sa-cai tokens_ext '(principal "<PRINCIPAL_ID>")'

# Alternative method - Returns basic token IDs
dfx canister --network ic call v6gck-vqaaa-aaaal-qi3sa-cai tokens '(principal "<PRINCIPAL_ID>")'
```

Response details:
- `tokens_ext`: Returns detailed token metadata including ownership status and token-specific attributes
- `tokens`: Returns a simplified list of token IDs owned by the principal

Important Implementation Notes:
1. **Daku Motokos**: Only supports the `getTokens` method. Attempts to use other standard methods (`balance`, `tokens`, `tokens_ext`) will fail.
2. **GG Album Release**: Supports both `tokens` and `tokens_ext` methods, with `tokens_ext` providing more detailed information.

For integration purposes, always use the primary recommended method for each collection:
- Daku Motokos: `getTokens`
- GG Album Release: `tokens_ext`

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