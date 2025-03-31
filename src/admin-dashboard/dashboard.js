// World 8 Staking Dashboard - JavaScript Functions

/*
 * CHANGE LOG:
 * ----------
 * - Updated import to use named export from canister-integration.js
 * - Enhanced error handling with fallbacks to mock data
 * - Added comprehensive memory and performance visualization
 * - Fixed timing issues with async canister calls
 * - Improved UI updates with proper data formatting
 * 
 * PROBLEMS & SOLUTIONS:
 * -------------------
 * PROBLEM: Connectivity issues with canisters during development
 * SOLUTION: Added robust fallback to mock data when connection fails
 * 
 * PROBLEM: Different data formats between mock and real API responses
 * SOLUTION: Standardized data processing in updateHealthUI and updateStatsUI
 * 
 * PROBLEM: Performance data visualization missing or incomplete
 * SOLUTION: Added performanceHistory tracking and visualization
 * 
 * PROBLEM: Long-running operations blocking UI
 * SOLUTION: Added loading indicators and async processing
 */

// Import the canister integration API
// NOTE: Changed from default to named import
import { canisterAPI } from './canister-integration.js';

// Fallback to mockAPI if needed
import mockAPI from './mock-api.js';

// Configuration
const REFRESH_INTERVAL = 30000; // 30 seconds
const CONNECTION_RETRY_DELAY = 5000; // 5 seconds
const MEMORY_THRESHOLD_WARNING = 60; // Percentage
const MEMORY_THRESHOLD_CRITICAL = 85; // Percentage

// Dashboard state
let dashboardState = {
  isConnected: false,
  canisterId: null,
  useLocalReplica: true, // Default to local replica
  memoryHistory: [],
  performanceHistory: [],
  logs: []
};

// Chart instances
let memoryChart = null;
let performanceChart = null;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize charts
  initializeCharts();
  
  // Try to connect to the actual canister
  // NOTE: Changed to use canisterAPI instead of api
  const connected = await canisterAPI.initialize(dashboardState.useLocalReplica);
  
  if (connected) {
    dashboardState.isConnected = true;
    document.getElementById('connectionStatus').textContent = 'Connected to Internet Computer';
    document.getElementById('connectionStatus').className = 'text-success';
  } else {
    dashboardState.isConnected = false;
    document.getElementById('connectionStatus').textContent = 'Using Mock Data (Not Connected)';
    document.getElementById('connectionStatus').className = 'text-warning';
  }
  
  // Set up refresh button
  document.getElementById('refreshButton').addEventListener('click', updateDashboard);
  
  // Set up payout button (in admin section)
  document.getElementById('processPayoutButton').addEventListener('click', processPayout);
  
  // Set up reconnect button
  document.getElementById('reconnectButton').addEventListener('click', async function() {
    const useLocal = document.getElementById('useLocal').checked;
    dashboardState.useLocalReplica = useLocal;
    const connected = await canisterAPI.initialize(useLocal);
    
    if (connected) {
      dashboardState.isConnected = true;
      document.getElementById('connectionStatus').textContent = 'Connected to Internet Computer';
      document.getElementById('connectionStatus').className = 'text-success';
      updateDashboard();
    } else {
      dashboardState.isConnected = false;
      document.getElementById('connectionStatus').textContent = 'Using Mock Data (Not Connected)';
      document.getElementById('connectionStatus').className = 'text-warning';
    }
  });
  
  // Initial update
  updateDashboard();
  
  // Auto refresh every 30 seconds
  setInterval(updateDashboard, REFRESH_INTERVAL);
});

// Initialize charts
function initializeCharts() {
  // Memory usage chart
  const memoryCtx = document.getElementById('memoryChart').getContext('2d');
  memoryChart = new Chart(memoryCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Memory Usage (KB)',
        data: [],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: (items) => formatTimestamp(items[0].label)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Memory (KB)'
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 6,
            callback: function(value, index) {
              return formatTime(this.getLabelForValue(value));
            }
          }
        }
      }
    }
  });
  
  // Performance chart
  const perfCtx = document.getElementById('performanceChart').getContext('2d');
  performanceChart = new Chart(perfCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Processing Time (ms)',
        data: [],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: (items) => formatTimestamp(items[0].label)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Time (ms)'
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 6,
            callback: function(value, index) {
              return formatTime(this.getLabelForValue(value));
            }
          }
        }
      }
    }
  });
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleString();
}

// Update dashboard with data
async function updateDashboard() {
  // PROBLEM: Need to check both connection flags to ensure proper state
  // SOLUTION: Added check for isInitialized method
  if (!dashboardState.isConnected && !canisterAPI.isInitialized()) {
    console.warn('Not connected to canister. Using mock data.');
    // Use mock data if not connected
    return updateWithMockData();
  }
  
  const loadingIndicator = document.getElementById('loadingIndicator');
  loadingIndicator.style.display = 'block';
  
  try {
    const startTime = performance.now();
    
    // PROBLEM: Multiple separate API calls causing performance issues
    // SOLUTION: Consolidated API calls into a single getDashboardData method
    // Get all dashboard data in one call
    const data = await canisterAPI.getDashboardData();
    
    // Update UI with the retrieved data
    updateHealthUI(data.health);
    updateStatsUI(data.stats);
    updateLogs(data.logs);
    
    // Update memory chart
    // PROBLEM: Inconsistent memory data from different sources
    // SOLUTION: Check if history is available, otherwise use current snapshot
    if (data.memory_history && data.memory_history.length > 0) {
      updateMemoryChartWithHistory(data.memory_history);
    } else {
      updateMemoryChart(data.health.memory_usage_kb);
    }
    
    // Update performance chart
    if (data.performance_history && data.performance_history.length > 0) {
      updatePerformanceChartWithHistory(data.performance_history);
    } else {
      updatePerformanceChart(data.stats.processing_time_ms || 0);
    }
    
    // Update CSV data status
    const isUsingCSV = await canisterAPI.isUsingCsvData();
    const totalHolders = await canisterAPI.getTotalHolders();
    
    document.getElementById('csv-data-status').textContent = isUsingCSV ? 'Using CSV Data' : 'Using Canister Data';
    document.getElementById('total-holders-count').textContent = `${totalHolders} holders`;
    document.getElementById('csv-update-time').textContent = new Date().toLocaleString();
    
    // Update last refresh time
    document.getElementById('lastRefresh').textContent = new Date().toLocaleString();
    
    const endTime = performance.now();
    console.log(`Dashboard updated in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('Dashboard update failed:', error);
    addLog('ERROR', 'Failed to update dashboard', error.message);
  } finally {
    // Hide loading indicator
    loadingIndicator.style.display = 'none';
  }
}

// Update with mock data when not connected
// PROBLEM: No fallback when canister connection fails
// SOLUTION: Added comprehensive mock data update
function updateWithMockData() {
  const mockData = mockAPI.getAllDashboardData();
  
  // Update UI with mock data
  updateHealthUI(mockData.health);
  updateStatsUI(mockData.stats);
  updateLogs(mockData.logs);
  updateMemoryChartWithHistory(mockData.memory_history);
  updatePerformanceChartWithHistory(mockData.performance_history);
  
  document.getElementById('csv-data-status').textContent = 'MOCK DATA - Not connected to canisters';
  document.getElementById('total-holders-count').textContent = 'MOCK DATA - 5 holders';
  document.getElementById('csv-update-time').textContent = new Date().toLocaleString();
  
  // Update last refresh time
  document.getElementById('lastRefresh').textContent = new Date().toLocaleString();
  
  addLog('WARNING', 'Using mock data - not connected to Internet Computer', 'System');
}

// Process a payout (admin function)
async function processPayout() {
  if (!dashboardState.isConnected) {
    showError('Cannot process payout: Not connected to canister');
    return;
  }
  
  const payoutButton = document.getElementById('processPayoutButton');
  const payoutStatus = document.getElementById('payoutStatus');
  
  // Disable button and show loading state
  payoutButton.disabled = true;
  payoutStatus.textContent = 'Processing...';
  
  try {
    // PROBLEM: Payout API changed to not return result data directly
    // SOLUTION: Fetch stats after payout to show results
    const result = await canisterAPI.processPayout();
    if (result.success) {
      payoutStatus.textContent = result.message;
      payoutStatus.className = 'text-success';
      
      // Update the dashboard after successful payout
      updateDashboard();
    } else {
      payoutStatus.textContent = result.message;
      payoutStatus.className = 'text-danger';
    }
  } catch (error) {
    console.error('Payout error:', error);
    payoutStatus.textContent = `Error: ${error.message || 'Unknown error'}`;
    payoutStatus.className = 'text-danger';
  } finally {
    // Re-enable button
    payoutButton.disabled = false;
  }
}

// Update health UI
function updateHealthUI(health) {
  // Update health status card
  document.getElementById('systemStatus').textContent = health.status;
  document.getElementById('systemStatus').className = health.is_healthy ? 'text-success' : 'text-danger';
  
  document.getElementById('errorCount').textContent = health.error_count;
  document.getElementById('warningCount').textContent = health.warning_count;
  document.getElementById('balanceStatus').textContent = health.balance_status;
  document.getElementById('networkStatus').textContent = health.network_status || 'Unknown';
  
  // Update memory usage
  document.getElementById('memoryUsage').textContent = `${health.memory_usage_kb.toLocaleString()} KB`;
  document.getElementById('memoryPeak').textContent = `${health.memory_peak_kb.toLocaleString()} KB`;
  
  // Calculate percentage of memory used
  // PROBLEM: Division by zero if peak is 0
  // SOLUTION: Added fallback for peak = 0 case
  const percentage = health.memory_peak_kb > 0 
    ? Math.round((health.memory_usage_kb / health.memory_peak_kb) * 100) 
    : 0;
  
  // Update progress bar
  const memoryBar = document.getElementById('memoryBar');
  memoryBar.style.width = `${percentage}%`;
  memoryBar.setAttribute('aria-valuenow', percentage);
  
  // Set color based on thresholds
  if (percentage >= MEMORY_THRESHOLD_CRITICAL) {
    memoryBar.className = 'progress-bar bg-danger';
  } else if (percentage >= MEMORY_THRESHOLD_WARNING) {
    memoryBar.className = 'progress-bar bg-warning';
  } else {
    memoryBar.className = 'progress-bar bg-success';
  }
  
  // Update memory percentage text
  document.getElementById('memoryPercentage').textContent = `${percentage}%`;
}

// Update statistics UI
function updateStatsUI(stats) {
  document.getElementById('totalHolders').textContent = stats.total_holders;
  document.getElementById('activeHolders').textContent = stats.active_holders;
  document.getElementById('totalPayouts').textContent = stats.total_payouts_processed;
  document.getElementById('successRate').textContent = `${stats.success_rate}%`;
  document.getElementById('totalAmount').textContent = formatTokenAmount(stats.total_payout_amount);
  
  // Update additional stats
  // PROBLEM: UI elements might not exist in all views
  // SOLUTION: Added existence checks before updating
  if (document.getElementById('processingTime')) {
    document.getElementById('processingTime').textContent = `${stats.processing_time_ms} ms`;
  }
  
  if (document.getElementById('networkFee')) {
    document.getElementById('networkFee').textContent = formatTokenAmount(stats.current_network_fee);
  }
  
  if (document.getElementById('lastPayoutTime') && stats.last_payout_time) {
    document.getElementById('lastPayoutTime').textContent = formatTimestamp(stats.last_payout_time);
  }
  
  if (document.getElementById('nextPayoutTime') && stats.next_payout_time) {
    document.getElementById('nextPayoutTime').textContent = formatTimestamp(stats.next_payout_time);
  }
}

// Format token amount (convert from lowest denomination)
// PROBLEM: Inconsistent token display formatting
// SOLUTION: Standardized token display with proper decimal places
function formatTokenAmount(amount) {
  const tokens = Number(amount) / 100000000; // 8 decimal places
  return tokens.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  }) + ' ZOMB';
}

// Update logs
function updateLogs(logs) {
  const logContainer = document.getElementById('logContainer');
  // Clear existing logs if there are too many
  if (logContainer.children.length > 50) {
    logContainer.innerHTML = '';
  }
  
  // Add new logs in reverse order (newest first)
  for (const log of logs) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Create badge for log level
    const badge = document.createElement('span');
    badge.className = 'badge ' + getLogLevelClass(log.level);
    badge.textContent = log.level;
    
    // Create timestamp
    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = formatTime(log.timestamp);
    
    // Create message
    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = log.message;
    
    // Create source if available
    const source = document.createElement('span');
    source.className = 'log-source';
    source.textContent = log.source ? `[${log.source}]` : '';
    
    // Create details if available
    let details = null;
    if (log.details) {
      details = document.createElement('div');
      details.className = 'log-details';
      details.textContent = log.details;
    }
    
    // Assemble the log entry
    logEntry.appendChild(badge);
    logEntry.appendChild(timestamp);
    if (log.source) logEntry.appendChild(source);
    logEntry.appendChild(message);
    if (details) logEntry.appendChild(details);
    
    // Add to container (at the beginning)
    logContainer.insertBefore(logEntry, logContainer.firstChild);
  }
}

// Update memory chart
function updateMemoryChart(memoryKb) {
  const timestamp = Date.now();
  
  // Add new data point
  dashboardState.memoryHistory.push({
    timestamp: timestamp,
    value: memoryKb
  });
  
  // Limit history size
  if (dashboardState.memoryHistory.length > 30) {
    dashboardState.memoryHistory.shift();
  }
  
  updateMemoryChartWithHistory(dashboardState.memoryHistory);
}

// Update memory chart with history data
function updateMemoryChartWithHistory(historyData) {
  // Update chart
  memoryChart.data.labels = historyData.map(point => point.timestamp);
  memoryChart.data.datasets[0].data = historyData.map(point => point.value);
  memoryChart.update();
}

// Update performance chart
function updatePerformanceChart(processingTime) {
  const timestamp = Date.now();
  
  // Add new data point
  dashboardState.performanceHistory.push({
    timestamp: timestamp,
    value: processingTime
  });
  
  // Limit history size
  if (dashboardState.performanceHistory.length > 30) {
    dashboardState.performanceHistory.shift();
  }
  
  updatePerformanceChartWithHistory(dashboardState.performanceHistory);
}

// Update performance chart with history data
function updatePerformanceChartWithHistory(historyData) {
  // Update chart
  performanceChart.data.labels = historyData.map(point => point.timestamp);
  performanceChart.data.datasets[0].data = historyData.map(point => point.value);
  performanceChart.update();
}

// Get CSS class for log level
function getLogLevelClass(level) {
  switch (level.toUpperCase()) {
    case 'DEBUG': return 'bg-secondary';
    case 'INFO': return 'bg-info';
    case 'WARNING': return 'bg-warning';
    case 'ERROR': return 'bg-danger';
    case 'CRITICAL': return 'bg-dark';
    default: return 'bg-secondary';
  }
}

// Show an error message
function showError(message) {
  const errorAlert = document.createElement('div');
  errorAlert.className = 'alert alert-danger alert-dismissible fade show';
  errorAlert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.getElementById('alerts').appendChild(errorAlert);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    errorAlert.classList.remove('show');
    setTimeout(() => errorAlert.remove(), 500);
  }, 5000);
}

// Format timestamp for display
function formatTime(timestamp) {
  const date = new Date(Number(timestamp) / 1000000);
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

// Add log to the dashboard (not to the canister)
function addLog(level, message, source = null) {
  const logs = [{
    timestamp: Date.now() * 1000000,
    level: level,
    message: message,
    source: source || 'Dashboard',
    details: null
  }];
  
  updateLogs(logs);
} 