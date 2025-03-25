# Dashboard Generator

This script generates an interactive dashboard for World 8 NFT staking system.

## Features
- CSS-based globe animation that works in all modern browsers
- Interactive countdown timer that resets after reaching zero
- Charts showing staking history
- Lists of top stakers and NFT distribution
- Clean, modern UI with a dark theme and cyan accents

## NFT Registry Interface
- The system now supports NFT registry querying using Candid interface
- Successfully implemented for Daku NFT collection (canister ID: erfen-7aaaa-aaaap-ahniq-cai)
- Registry records contain TokenIndex (u32) and AccountId (String) pairs
- Multiple fallback mechanisms for different canister implementations
- Robust error handling with proper tuple return types

## Usage
Run the script with:
```
python3 generate_globe_dashboard.py
```

This will generate an HTML file named world8_globe_dashboard.html that can be opened in any browser.
