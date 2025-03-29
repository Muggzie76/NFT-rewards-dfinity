// Mock API to simulate canister interaction
// This would be replaced with actual Internet Computer API calls in production

// Sample data that simulates the canister's state
let mockCanisterState = {
  // Health status data
  health: {
    status: "Healthy",
    error_count: 0,
    warning_count: 2,
    balance_status: "Sufficient",
    memory_usage_kb: 1245,
    memory_peak_kb: 1890,
    uptime_seconds: 86400
  },
  
  // Statistics about holders and payouts
  stats: {
    total_holders: 120,
    active_holders: 105,
    total_payouts_processed: 1450,
    average_processing_time_ms: 235,
    success_rate: 0.986,
    total_tokens_distributed: 24500000,
    last_payout_timestamp: Date.now() - 3600000
  },
  
  // Historical memory usage data
  memory_history: [
    { timestamp: Date.now() - 3600000 * 6, value: 980 },
    { timestamp: Date.now() - 3600000 * 5, value: 1050 },
    { timestamp: Date.now() - 3600000 * 4, value: 1240 },
    { timestamp: Date.now() - 3600000 * 3, value: 1190 },
    { timestamp: Date.now() - 3600000 * 2, value: 1300 },
    { timestamp: Date.now() - 3600000, value: 1245 }
  ],
  
  // Historical performance data
  performance_history: [
    { timestamp: Date.now() - 3600000 * 6, value: 210 },
    { timestamp: Date.now() - 3600000 * 5, value: 195 },
    { timestamp: Date.now() - 3600000 * 4, value: 230 },
    { timestamp: Date.now() - 3600000 * 3, value: 250 },
    { timestamp: Date.now() - 3600000 * 2, value: 245 },
    { timestamp: Date.now() - 3600000, value: 235 }
  ],
  
  // System logs
  logs: [
    { timestamp: Date.now() - 900000, level: "INFO", message: "Payout process completed successfully" },
    { timestamp: Date.now() - 1800000, level: "WARNING", message: "Memory usage approaching threshold" },
    { timestamp: Date.now() - 3600000, level: "INFO", message: "System balance checked: 25000000 tokens available" },
    { timestamp: Date.now() - 7200000, level: "WARNING", message: "Slow response time detected in holder lookup" },
    { timestamp: Date.now() - 10800000, level: "INFO", message: "Health check completed: System healthy" }
  ]
};

// Mock API class
class MockCanisterAPI {
  // Get health status
  async getHealth() {
    // Simulate network delay
    await this.delay(500);
    
    // Return a copy of the health data to prevent mutation
    return { ...mockCanisterState.health };
  }
  
  // Get statistics
  async getStats() {
    // Simulate network delay
    await this.delay(700);
    
    // Return a copy of the stats data to prevent mutation
    return { ...mockCanisterState.stats };
  }
  
  // Get memory usage history
  async getMemoryHistory() {
    // Simulate network delay
    await this.delay(600);
    
    // Return a copy of the memory history data to prevent mutation
    return [...mockCanisterState.memory_history];
  }
  
  // Get performance metrics history
  async getPerformanceHistory() {
    // Simulate network delay
    await this.delay(550);
    
    // Return a copy of the performance history data to prevent mutation
    return [...mockCanisterState.performance_history];
  }
  
  // Get system logs
  async getLogs(limit = 10) {
    // Simulate network delay
    await this.delay(450);
    
    // Return the requested number of logs
    return [...mockCanisterState.logs].slice(0, limit);
  }
  
  // Get all dashboard data in a single call
  async getAllDashboardData() {
    // Simulate network delay
    await this.delay(800);
    
    // Return a complete copy of the data
    return {
      health: { ...mockCanisterState.health },
      stats: { ...mockCanisterState.stats },
      memory_history: [...mockCanisterState.memory_history],
      performance_history: [...mockCanisterState.performance_history],
      logs: [...mockCanisterState.logs]
    };
  }
  
  // Simulate a delay (network latency)
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Simulate a payout process (for testing)
  async simulatePayout() {
    // Simulate network delay for processing
    await this.delay(1500);
    
    // Update mock state to reflect a new payout
    mockCanisterState.stats.total_payouts_processed += 1;
    mockCanisterState.stats.total_tokens_distributed += 250000;
    mockCanisterState.stats.last_payout_timestamp = Date.now();
    
    // Add a new memory data point
    const newMemoryValue = 1275 + Math.floor(Math.random() * 100);
    mockCanisterState.memory_history.push({
      timestamp: Date.now(),
      value: newMemoryValue
    });
    mockCanisterState.memory_history = mockCanisterState.memory_history.slice(-10);
    
    // Update current memory usage
    mockCanisterState.health.memory_usage_kb = newMemoryValue;
    
    // Add a new performance data point
    const newPerfValue = 230 + Math.floor(Math.random() * 30);
    mockCanisterState.performance_history.push({
      timestamp: Date.now(),
      value: newPerfValue
    });
    mockCanisterState.performance_history = mockCanisterState.performance_history.slice(-10);
    
    // Update average processing time
    mockCanisterState.stats.average_processing_time_ms = 
      (mockCanisterState.stats.average_processing_time_ms * 0.9) + (newPerfValue * 0.1);
    
    // Add a log entry
    mockCanisterState.logs.unshift({
      timestamp: Date.now(),
      level: "INFO",
      message: `Payout process completed: distributed 250,000 tokens to holders`
    });
    mockCanisterState.logs = mockCanisterState.logs.slice(0, 20);
    
    return {
      success: true,
      message: "Payout simulated successfully",
      tokens_distributed: 250000
    };
  }
  
  // Simulate an error condition (for testing)
  async simulateError() {
    // Simulate network delay
    await this.delay(600);
    
    // Update mock state to reflect an error
    mockCanisterState.health.error_count += 1;
    mockCanisterState.health.status = mockCanisterState.health.error_count > 2 ? "Error" : "Warning";
    
    // Add a log entry
    mockCanisterState.logs.unshift({
      timestamp: Date.now(),
      level: "ERROR",
      message: "Failed to process payout: insufficient balance"
    });
    
    return {
      success: false,
      message: "Error simulation triggered",
      error_count: mockCanisterState.health.error_count
    };
  }
  
  // Reset the mock state (for testing)
  async resetMockState() {
    // Simulate network delay
    await this.delay(300);
    
    // Reset error and warning counts
    mockCanisterState.health.error_count = 0;
    mockCanisterState.health.warning_count = 0;
    mockCanisterState.health.status = "Healthy";
    
    return {
      success: true,
      message: "Mock state reset successfully"
    };
  }
}

// Export singleton instance
const mockAPI = new MockCanisterAPI();
export default mockAPI;

// mock-api.js - Provides sample data for testing the dashboard
// This is used when the actual canister isn't available

/**
 * Get sample data for testing the dashboard
 * @returns {Object} Sample data with health, stats and logs
 */
export function getSampleData() {
  const now = Date.now();
  const nowNano = BigInt(now) * BigInt(1000000); // Convert to nanoseconds
  
  // Sample health data
  const health = {
    is_healthy: true,
    last_check: nowNano,
    error_count: 0,
    warning_count: 1,
    memory_usage_kb: 494 * 1024, // 494 MB in KB
    memory_peak_kb: 512 * 1024,  // 512 MB in KB
    balance_status: "HEALTHY"
  };
  
  // Sample stats data
  const stats = {
    total_holders: 1250,
    active_holders: 1127,
    total_payouts_processed: 12475,
    total_payout_amount: 250000000000, // 2,500 tokens (8 decimal places)
    failed_transfers: 23,
    average_processing_time: 1250, // ms
    success_rate: 99,
  };
  
  // Sample logs
  const logs = [
    {
      timestamp: nowNano,
      level: { INFO: null },
      message: "Dashboard initialized with sample data",
      source: "MockAPI"
    },
    {
      timestamp: nowNano - BigInt(60000) * BigInt(1000000),
      level: { INFO: null },
      message: "Memory usage: 494 MB, Peak: 512 MB",
      source: "MemoryMonitor"
    },
    {
      timestamp: nowNano - BigInt(300000) * BigInt(1000000),
      level: { WARNING: null },
      message: "Using sample data - canister connection not available",
      source: "Dashboard"
    },
    {
      timestamp: nowNano - BigInt(600000) * BigInt(1000000),
      level: { INFO: null },
      message: "Simulated payout completed. Processed 125 holders with 99% success rate.",
      source: "PayoutProcessor"
    },
    {
      timestamp: nowNano - BigInt(3600000) * BigInt(1000000),
      level: { DEBUG: null },
      message: "Memory stats updated: current=494MB, peak=512MB",
      source: "MemoryTracker"
    }
  ];
  
  // Sample memory history (last 24 hours, hourly points)
  const memoryHistory = [];
  for (let i = 24; i >= 0; i--) {
    // Generate slightly increasing memory usage over time
    const timestamp = now - (i * 3600000);
    const value = 450 * 1024 + Math.floor(Math.random() * 10000) + (i * 2000);
    memoryHistory.push({
      timestamp: timestamp,
      value: value
    });
  }
  
  // Sample performance history (last 24 hours, hourly points)
  const performanceHistory = [];
  for (let i = 24; i >= 0; i--) {
    const timestamp = now - (i * 3600000);
    // Randomize processing time between 1000ms and 1500ms
    const value = 1000 + Math.floor(Math.random() * 500);
    performanceHistory.push({
      timestamp: timestamp,
      value: value
    });
  }
  
  // Return complete sample data
  return {
    health,
    stats,
    logs,
    memoryHistory,
    performanceHistory
  };
}

/**
 * Generate a simulated payout result
 * @returns {Object} Simulated payout result
 */
export function simulateProcessPayout() {
  const processedCount = 120 + Math.floor(Math.random() * 10);
  const failedCount = Math.floor(Math.random() * 3);
  const successCount = processedCount - failedCount;
  const executionTime = 1000 + Math.floor(Math.random() * 500);
  const totalAmount = processedCount * 200000000; // 2 tokens per holder
  
  return {
    processed_count: processedCount,
    total_amount: totalAmount,
    success_count: successCount,
    execution_time_ms: executionTime
  };
}

/**
 * Generate a new log entry with the current timestamp
 * @param {string} message - Log message
 * @param {string} level - Log level (INFO, WARNING, ERROR, etc)
 * @param {string} source - Source of the log
 * @returns {Object} Log entry
 */
export function createLogEntry(message, level = "INFO", source = "MockAPI") {
  const levelObj = {};
  levelObj[level] = null;
  
  return {
    timestamp: BigInt(Date.now()) * BigInt(1000000),
    level: levelObj,
    message: message,
    source: source
  };
} 