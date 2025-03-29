# World 8 Staking Dashboard Deployment

This directory contains tools and assets for deploying the World 8 Staking Dashboard to the Internet Computer.

## Directory Structure

```
deployment-tools/
├── dashboard/               # Dashboard HTML/CSS/JS files
│   ├── globe/               # Globe visualization dashboard
│   └── standard/            # Standard dashboard 
├── assets/                  # Static assets for deployment
├── deploy.sh                # Deployment shell script
├── upload.js                # Node.js upload script
├── dfx.json                 # DFX configuration
└── README.md                # This file
```

## Deployment Options

### Option 1: Deploy Script (requires controller access)

The `deploy.sh` script automates the deployment process using the DFX command-line tools.

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

This script will:
1. Create a temporary deployment directory
2. Copy dashboard assets
3. Configure DFX settings
4. Deploy to the canister

### Option 2: Upload Script (Direct Upload)

The `upload.js` script provides more direct control over asset uploads using the asset canister interface.

```bash
# Install dependencies
npm install

# Upload all assets (preserving existing assets)
node upload.js

# Upload all assets (clearing existing assets first)
node upload.js --clear
```

## Access URLs

After deployment, you can access the dashboard at:

- Primary URL: `https://zksib-liaaa-aaaaf-qanva-cai.icp0.io/`
- Alternate URLs:
  - `https://zksib-liaaa-aaaaf-qanva-cai.raw.icp0.io/`
  - `https://zksib-liaaa-aaaaf-qanva-cai.icp-api.io/`

## Troubleshooting

- **Controller Permissions**: The default identity must be a controller of the canister to deploy. Check controllers with:
  ```
  dfx canister --network=ic info zksib-liaaa-aaaaf-qanva-cai
  ```
  
- **Identity Management**: You may need to use a different identity:
  ```
  dfx identity list
  dfx identity use <identity_name>
  ```

- **Asset Sync**: If the dashboard appears outdated, try clearing browser cache or using the upload script with the `--clear` flag.

## Development

To make changes to the dashboard:

1. Edit files in the `dashboard/` directory
2. Run one of the deployment options above
3. Verify changes in the browser (you may need to clear cache) 