# World 8 NFT Staking Platform

This repository contains the complete codebase for the World 8 NFT Staking platform, which allows NFT holders to stake their collections and earn rewards.

## System Overview

The platform consists of several components:
- **Wallet Canister**: Handles NFT tracking for user wallets
- **Payout Canister**: Manages rewards distribution and staking calculations
- **Frontend**: Modern React-based dashboard for users to monitor their stakes and rewards
- **Supporting Services**: Token handling, NFT registry interfaces, and testing tools

## Project Structure

```
World 8 Staking Dapp/
├── src/                          # Source code directory
│   ├── frontend-experimental/    # React-based user dashboard
│   ├── payout/                   # Payout canister implementation
│   ├── wallet_rust/              # Wallet canister implementation
│   ├── icrc1_token/              # ICRC-1 token implementation
│   ├── mock_wallet/              # Mock wallet for testing
│   ├── test_token/               # Test token implementation
│   └── declarations/             # Generated declarations
├── data/                         # NFT holder data and analytics
├── docs/                         # Documentation and guides
│   ├── guides/                   # Setup and implementation guides
│   └── screenshots/              # UI screenshots and visual documentation
├── scripts/                      # Utility scripts for management and deployment
├── test/                         # Test suite
└── target/                       # Compiled outputs
```

## Features
- **NFT Staking**: Stake NFTs from supported collections (Daku Motokos, GG Album, etc.)
- **Rewards System**: Automatic reward calculations based on staked NFT count
- **Modern Dashboard**: Clean, responsive UI for tracking stats and rewards
- **Portfolio View**: Track all your staked NFTs in one place
- **Reward History**: View past payouts and performance

## Deployment
The platform is currently deployed on the Internet Computer with the following canister IDs:
- Frontend: `zksib-liaaa-aaaaf-qanva-cai`
- Wallet: `rce3q-iaaaa-aaaap-qpyfa-cai`
- Access it at: [https://zksib-liaaa-aaaaf-qanva-cai.icp0.io/](https://zksib-liaaa-aaaaf-qanva-cai.icp0.io/)

## Development

### Prerequisites
- [DFX](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-dfx/) >= 0.14.0
- Node.js >= 16.0.0
- Rust >= 1.54.0

### Setup
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `dfx start --background` to start a local replica
4. Run `dfx deploy` to deploy all canisters locally

### Running the Frontend
```bash
cd src/frontend-experimental
npm start
```

This will start the development server at http://localhost:3000

## Documentation
For more detailed information, see:
- [System Documentation](./SYSTEM_DOCUMENTATION.md)
- [Project Documentation](./PROJECT_DOCUMENTATION.md)
- Setup guides in the `docs/guides` directory
