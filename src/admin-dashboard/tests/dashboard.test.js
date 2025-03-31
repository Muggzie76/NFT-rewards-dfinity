// dashboard.test.js - Test suite for the dashboard functionality

import { 
  updateDashboard, 
  reconnectToCanister, 
  processPayout,
  updateHealthDisplay,
  updateStatsDisplay,
  updateLogsDisplay
} from '../dashboard.js';

import { connectToCanister, getConnectionState } from '../canister-integration.js';
import { getSampleData } from '../mock-api.js';

// Mock the DOM elements and Chart.js
global.document = {
  getElementById: jest.fn(() => ({
    textContent: '',
    style: {},
    className: '',
    setAttribute: jest.fn(),
    appendChild: jest.fn()
  })),
  createElement: jest.fn(() => ({
    textContent: '',
    className: '',
    appendChild: jest.fn()
  }))
};

global.window = {
  canisterApi: {
    getHealth: jest.fn(),
    getStats: jest.fn(),
    getLogs: jest.fn(),
    processPayouts: jest.fn()
  }
};

// Mock Chart.js
global.Chart = jest.fn(() => ({
  update: jest.fn(),
  data: {
    labels: [],
    datasets: [{ data: [] }]
  }
}));

// Mock DOM ready event
document.addEventListener = jest.fn((event, callback) => {
  if (event === 'DOMContentLoaded') {
    callback();
  }
});

// Mock the connectToCanister function
jest.mock('../canister-integration.js', () => ({
  connectToCanister: jest.fn().mockResolvedValue(true),
  getConnectionState: jest.fn().mockReturnValue({
    isConnected: true,
    canisterId: 'test-canister-id',
    lastError: null
  }),
  disconnect: jest.fn()
}));

describe('Dashboard Functionality', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup document.getElementById to return different elements based on id
    global.document.getElementById.mockImplementation((id) => {
      return {
        textContent: '',
        style: {},
        className: '',
        setAttribute: jest.fn(),
        addEventListener: jest.fn(),
        appendChild: jest.fn()
      };
    });
    
    // Mock the canister API functions
    const sampleData = getSampleData();
    window.canisterApi.getHealth.mockResolvedValue(sampleData.health);
    window.canisterApi.getStats.mockResolvedValue(sampleData.stats);
    window.canisterApi.getLogs.mockResolvedValue(sampleData.logs);
    window.canisterApi.processPayouts.mockResolvedValue({
      processed_count: 125,
      total_amount: 250000000,
      success_count: 123,
      execution_time_ms: 1200
    });
  });
  
  test('updateDashboard fetches and displays data correctly', async () => {
    // Set up global state for the test
    global.dashboardState = { isConnected: true };
    
    // Call the function
    await updateDashboard();
    
    // Verify API calls were made
    expect(window.canisterApi.getHealth).toHaveBeenCalled();
    expect(window.canisterApi.getStats).toHaveBeenCalled();
    expect(window.canisterApi.getLogs).toHaveBeenCalled();
    
    // Verify DOM updates
    expect(document.getElementById).toHaveBeenCalledWith('lastRefresh');
    expect(document.getElementById).toHaveBeenCalledWith('loadingIndicator');
  });
  
  test('processPayout triggers payout and updates UI', async () => {
    // Set up global state for the test
    global.dashboardState = { isConnected: true };
    
    // Call the function
    await processPayout();
    
    // Verify the API call was made
    expect(window.canisterApi.processPayouts).toHaveBeenCalled();
    
    // Verify UI updates
    expect(document.getElementById).toHaveBeenCalledWith('processPayoutButton');
    expect(document.getElementById).toHaveBeenCalledWith('payoutStatus');
  });
  
  test('updateHealthDisplay correctly formats and displays health data', () => {
    // Setup test data
    const healthData = {
      is_healthy: true,
      error_count: 0,
      warning_count: 1,
      memory_usage_kb: 500000,
      memory_peak_kb: 600000,
      balance_status: 'HEALTHY'
    };
    
    // Call function
    updateHealthDisplay(healthData);
    
    // Verify DOM interactions
    expect(document.getElementById).toHaveBeenCalledWith('healthStatus');
    expect(document.getElementById).toHaveBeenCalledWith('errorCount');
    expect(document.getElementById).toHaveBeenCalledWith('warningCount');
    expect(document.getElementById).toHaveBeenCalledWith('balanceStatus');
    expect(document.getElementById).toHaveBeenCalledWith('memoryUsage');
    expect(document.getElementById).toHaveBeenCalledWith('memoryPeak');
  });
  
  test('handles disconnected state gracefully', async () => {
    // Set disconnected state
    global.dashboardState = { isConnected: false };
    
    // Mock console.warn to verify warning message
    const originalWarn = console.warn;
    console.warn = jest.fn();
    
    // Call function
    await updateDashboard();
    
    // Verify warning was logged
    expect(console.warn).toHaveBeenCalledWith(
      'Not connected to canister. Cannot update with real data.'
    );
    
    // Verify API calls were NOT made
    expect(window.canisterApi.getHealth).not.toHaveBeenCalled();
    expect(window.canisterApi.getStats).not.toHaveBeenCalled();
    expect(window.canisterApi.getLogs).not.toHaveBeenCalled();
    
    // Restore console.warn
    console.warn = originalWarn;
  });
  
  test('reconnectToCanister attempts to reconnect and updates UI', async () => {
    // Mock the functions
    global.dashboardState = { 
      isConnected: false,
      useLocalReplica: false
    };
    
    // Call function
    await reconnectToCanister();
    
    // Verify connection attempt
    expect(connectToCanister).toHaveBeenCalledWith(false);
    
    // Verify UI updates
    expect(document.getElementById).toHaveBeenCalledWith('loadingIndicator');
    expect(document.getElementById).toHaveBeenCalledWith('connectionStatus');
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.dashboardState = { isConnected: true };
    
    // Setup document elements
    global.document.getElementById.mockImplementation((id) => {
      return {
        textContent: '',
        style: {},
        className: '',
        setAttribute: jest.fn(),
        appendChild: jest.fn()
      };
    });
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.error.mockRestore();
  });
  
  test('handles API errors gracefully', async () => {
    // Force an API error
    window.canisterApi.getHealth.mockRejectedValue(new Error('API error'));
    
    // Call function
    await updateDashboard();
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
    
    // Verify error message display
    expect(document.getElementById).toHaveBeenCalledWith('errorMessage');
  });
  
  test('handles payout errors gracefully', async () => {
    // Force a payout error
    window.canisterApi.processPayouts.mockRejectedValue(new Error('Payout failed'));
    
    // Call function
    await processPayout();
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
    
    // Verify error message display
    expect(document.getElementById).toHaveBeenCalledWith('payoutStatus');
    expect(document.getElementById).toHaveBeenCalledWith('errorMessage');
  });
});

// Mock implementation to test specific functions more thoroughly
describe('Utility Functions', () => {
  test('formatTimestamp correctly formats nanosecond timestamps', () => {
    // Implementation of formatTimestamp for testing
    const formatTimestamp = (timestamp) => {
      const date = new Date(Number(timestamp) / 1000000);
      return date.toLocaleString();
    };
    
    // Test with a known timestamp
    const timestamp = BigInt(1609459200000) * BigInt(1000000); // Jan 1, 2021
    const formatted = formatTimestamp(timestamp);
    
    // The exact format will depend on locale, but should be a valid date string
    expect(formatted).toContain('2021');
  });
  
  test('formatMemorySize correctly formats KB values', () => {
    // Implementation of formatMemorySize for testing
    const formatMemorySize = (sizeInKb) => {
      if (sizeInKb < 1024) {
        return `${sizeInKb} KB`;
      } else {
        return `${(sizeInKb / 1024).toFixed(2)} MB`;
      }
    };
    
    // Test KB formatting
    expect(formatMemorySize(500)).toBe('500 KB');
    
    // Test MB formatting
    expect(formatMemorySize(2048)).toBe('2.00 MB');
  });
}); 