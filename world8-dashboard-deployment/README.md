# World 8 Staking Dashboard Deployment

This directory contains the World 8 Staking Dashboard frontend files and deployment tools.

## Directory Structure

- `index.html` - Main entry page that redirects to dashboard selection
- `dashboard/` - Dashboard-related pages
  - `standard/` - Standard dashboard view
  - `globe/` - Globe visualization dashboard view
- JavaScript files - Application code
- Other assets - Images, favicon, etc.

## Deployment Options

There are two ways to deploy these assets:

### Option 1: Using DFX Deploy Script (Recommended)

The `deploy.sh` script deploys assets using the standard dfx deployment process:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

This script will:
1. Create a temporary deployment directory
2. Copy all assets to the deployment directory
3. Set up a dfx.json configuration
4. Deploy to the Internet Computer

### Option 2: Using Node.js Upload Script

The `upload.js` script provides more direct control over asset uploads:

```bash
# Install dependencies
npm install

# Upload all assets (preserving existing assets)
npm run upload

# Clear existing assets and upload fresh
npm run upload:clear
```

## URLs

After deployment, the dashboard will be accessible at:

- Primary URL: https://zksib-liaaa-aaaaf-qanva-cai.icp0.io/
- Alternate URL: https://zksib-liaaa-aaaaf-qanva-cai.ic0.app/

## Troubleshooting

If you encounter deployment issues:

1. Check that you have the latest DFX version installed
2. Make sure your identity has proper controller permissions on the canister
3. If getting errors about command injection (`$(cat dist/index.html | xxd -p | tr -d n)%`), 
   try deploying with the Node.js script with the `--clear` option first

## Development

To make changes to the dashboard:

1. Edit the HTML, JavaScript, and CSS files in this directory
2. Test locally if needed
3. Deploy using one of the methods above 