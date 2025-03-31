# World 8 Staking Dashboard

A comprehensive monitoring and administration dashboard for the World 8 Staking System built on the Internet Computer.

## Features

- **Real-time System Monitoring**: Track health status, memory usage, and balance information
- **Performance Metrics**: Monitor payout processing times and success rates
- **Memory Usage Tracking**: Visualize memory consumption with historical graphs
- **System Logs**: Access and filter system logs directly from the dashboard
- **Administration Tools**: Trigger payouts manually and configure system settings
- **Connection Management**: Support for both mainnet and local development environments

## Architecture

The dashboard is built using vanilla JavaScript with Chart.js for visualizations. It consists of several key components:

1. **Dashboard UI (`index.html`)**: The main interface that displays all monitoring data
2. **Dashboard Controller (`dashboard.js`)**: Handles UI updates and user interactions
3. **Canister Integration (`canister-integration.js`)**: Manages communication with the Internet Computer canisters
4. **Mock API (`mock-api.js`)**: Provides sample data for development and testing

## Getting Started

### Prerequisites

- Node.js 14+
- Internet Computer dfx CLI (for local development)

### Running Locally

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/world8-staking.git
   cd world8-staking
   ```

2. Start a local Internet Computer replica:
   ```
   dfx start --clean
   ```

3. Deploy the canisters:
   ```
   dfx deploy
   ```

4. Open the dashboard in your browser:
   ```
   open http://localhost:8000/?canisterId=$(dfx canister id dashboard)
   ```

## Usage

### Monitoring System Health

The dashboard provides real-time monitoring of several key metrics:

- **System Health**: Overall status with error and warning counts
- **Memory Usage**: Current and peak memory consumption with historical data
- **Balance Status**: Current token balance and status (Healthy/Warning/Critical)
- **Performance Metrics**: Average processing time, success rate, and other key metrics

### Administration

The admin section provides tools for managing the staking system:

- **Process Payouts**: Manually trigger the payout process for all eligible holders
- **Connection Options**: Switch between mainnet and local development environments

## Development

### Testing

To run the test suite:

```
cd src/dashboard
npm test
```

### Mock Mode

During development, you can use the mock API to simulate canister responses:

1. Edit `canister-integration.js` to force mock mode:
   ```javascript
   const FORCE_MOCK_MODE = true;
   ```

2. This will use sample data from `mock-api.js` instead of actual canister calls

## Security Considerations

- The dashboard requires Internet Identity authentication for admin functions
- All operations are logged and auditable
- Memory thresholds provide early warning for potential issues

## Performance Monitoring

The dashboard includes tools for monitoring the performance of the staking system:

- **Processing Time**: Track average and peak processing times
- **Success Rate**: Monitor the percentage of successful payouts
- **Memory Usage**: Track memory consumption over time to identify leaks or issues

## Troubleshooting

### Connection Issues

If you experience connection issues:

1. Check if you're using the correct network (mainnet vs local)
2. Verify that the canister IDs are correct
3. Check the browser console for error messages

### Data Not Updating

If the dashboard data isn't updating:

1. Click the refresh button to manually update
2. Check the connection status indicator
3. Verify that the canister is running properly

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 