/**
 * World 8 Staking System - Canister Integration
 * ===============================================
 * 
 * CHANGE LOG:
 * ----------
 * - Updated canister IDs to match local development environment
 * - Fixed interface definitions to match actual canister methods
 * - Resolved multiple default exports issues
 * - Updated memory stats format to match dashboard expectations
 * - Enhanced error handling with detailed logging
 * 
 * PROBLEMS & SOLUTIONS:
 * --------------------
 * PROBLEM: Canister ID mismatches causing connection failures
 * SOLUTION: Updated IDs to use local development canisters
 * 
 * PROBLEM: Interface definition mismatches with actual canister methods
 * SOLUTION: Updated IDL factory definitions to match actual interfaces
 * 
 * PROBLEM: Multiple default exports causing linter errors
 * SOLUTION: Switched to using named exports instead of default exports
 * 
 * PROBLEM: Memory history format differences between mock and real data
 * SOLUTION: Added formatting conversion layer for consistent data structure
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as PayoutIDL } from './declarations/payout/payout.did.js';
import { idlFactory as WalletIDL } from './declarations/wallet_rust/wallet_rust.did.js';

// Import mock API for development fallback
import mockAPI from './mock-api.js';

// Constants for canister IDs
// NOTE: Originally hardcoded to mainnet values which caused connection issues
const LOCAL_PAYOUT_CANISTER_ID = process.env.PAYOUT_CANISTER_ID || 'bd3sg-teaaa-aaaaa-qaaba-cai';
const LOCAL_WALLET_CANISTER_ID = process.env.WALLET_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai';

// Configuration
const LOCAL_CANISTER_ID = "be2us-64aaa-aaaaa-qaabq-cai";  // Default local canister ID
const MAINNET_CANISTER_ID = "bd3sg-teaaa-aaaaa-qaaba-cai"; // Mainnet canister ID

// Global canister state
let canisterState = {
  agent: null,
  actor: null,
  canisterId: null,
  isConnected: false,
  lastError: null
};

// Interface for the payout canister
// NOTE: Updated to match actual canister interface
const payoutIdlFactory = ({ IDL }) => {
  const HealthStatus = IDL.Record({
    'is_healthy': IDL.Bool,
    'last_check': IDL.Int,
    'error_count': IDL.Nat64,
    'warning_count': IDL.Nat64,
    'balance_status': IDL.Text,
    'network_status': IDL.Text,
    'memory_usage_kb': IDL.Nat64,
    'memory_peak_kb': IDL.Nat64,
  });
  
  // NOTE: Updated field types to match actual canister implementation
  const Statistics = IDL.Record({
    'total_holders': IDL.Nat64,
    'active_holders': IDL.Nat64,
    'total_payouts_processed': IDL.Nat64,
    'average_payout_amount': IDL.Nat64,
    'success_rate': IDL.Nat64,
    'total_payout_amount': IDL.Nat64,
    'processing_time_ms': IDL.Nat64,
    'current_network_fee': IDL.Nat64,
    'average_network_fee': IDL.Nat64,
    'failed_transfers': IDL.Nat64,
    'is_processing': IDL.Bool,
    'last_payout_time': IDL.Int,
    'next_payout_time': IDL.Int,
  });
  
  // NOTE: Simplified log level from variant to text
  const LogEntry = IDL.Record({
    'timestamp': IDL.Int,
    'level': IDL.Text,
    'message': IDL.Text,
    'source': IDL.Text,
    'details': IDL.Opt(IDL.Text),
  });
  
  // NOTE: Updated field names and added history field
  const MemoryStats = IDL.Record({
    'current_usage_kb': IDL.Nat64,
    'peak_usage_kb': IDL.Nat64,
    'usage_history': IDL.Vec(IDL.Tuple(IDL.Int, IDL.Nat64)),
  });
  
  return IDL.Service({
    'get_health': IDL.Func([], [HealthStatus], ['query']),
    'get_stats': IDL.Func([], [Statistics], ['query']),
    'get_logs': IDL.Func([IDL.Nat64], [IDL.Vec(LogEntry)], ['query']),
    'get_memory_stats': IDL.Func([], [MemoryStats], ['query']),
    'processPayouts': IDL.Func([], [], []),
  });
};

// Interface for the wallet canister
const walletIdlFactory = ({ IDL }) => {
  const NFTProgress = IDL.Record({
    'count': IDL.Nat64,
    'in_progress': IDL.Bool,
    'last_updated': IDL.Nat64,
  });
  
  const HolderInfo = IDL.Record({
    'daku_count': IDL.Nat64,
    'gg_count': IDL.Nat64,
    'total_count': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });
  
  return IDL.Service({
    'update_balance': IDL.Func([IDL.Principal, IDL.Nat64], [IDL.Nat64], []),
    'get_balance': IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    'update_all_holders': IDL.Func([], [IDL.Nat64], []),
    'get_all_holders': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, HolderInfo))], ['query']),
    'get_nft_count': IDL.Func([IDL.Principal], [NFTProgress], ['query']),
    'get_all_nft_counts': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, NFTProgress))], ['query']),
    'get_debug_info': IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'test_direct_canister_calls': IDL.Func([], [IDL.Vec(IDL.Text)], []),
    'test_ext_query': IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(IDL.Text)], []),
    'update_nft_count': IDL.Func([IDL.Principal], [IDL.Nat64], []),
    'set_verified_nft_counts': IDL.Func([IDL.Principal, IDL.Nat64, IDL.Nat64], [HolderInfo], []),
    'bulk_update_nft_counts': IDL.Func([IDL.Vec(IDL.Principal)], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64))], []),
    'load_csv_data': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'load_test_csv_data': IDL.Func([], [IDL.Bool], []),
    'is_using_csv_data': IDL.Func([], [IDL.Bool], ['query']),
    'get_total_holders': IDL.Func([], [IDL.Nat64], ['query']),
  });
};

// Dashboard Integration Class
class CanisterIntegration {
  constructor() {
    this.agent = null;
    this.payoutActor = null;
    this.walletActor = null;
    this.isConnected = false;
    this.useLocalReplica = true; // Default to using local replica
    this.localHost = 'http://localhost:8000';
  }
  
  // Initialize connection to Internet Computer
  // NOTE: Default changed to true for local development
  async initialize(useLocal = true) {
    try {
      this.useLocalReplica = useLocal;
      const host = this.useLocalReplica ? this.localHost : IC_HOST;
      
      // Create an agent to talk to the IC
      this.agent = new HttpAgent({ host });
      
      // When developing locally, fetch the root key
      // NOTE: Critical for local development, not needed for production
      if (this.useLocalReplica) {
        await this.agent.fetchRootKey();
      }
      
      // Create an actor to interact with the payout canister
      this.payoutActor = Actor.createActor(payoutIdlFactory, {
        agent: this.agent,
        canisterId: LOCAL_PAYOUT_CANISTER_ID,
      });
      
      // Create an actor to interact with the wallet canister
      this.walletActor = Actor.createActor(walletIdlFactory, {
        agent: this.agent,
        canisterId: LOCAL_WALLET_CANISTER_ID,
      });
      
      // Test connection
      await this.payoutActor.get_health();
      this.isConnected = true;
      console.log('Successfully connected to the Internet Computer');
      return true;
    } catch (error) {
      console.error('Failed to connect to the Internet Computer:', error);
      this.isConnected = false;
      return false;
    }
  }
  
  // Get dashboard data
  async getDashboardData() {
    // If not connected, return mock data (useful for development)
    if (!this.isConnected) {
      console.warn('Using mock data because not connected to IC');
      return mockAPI.getAllDashboardData();
    }
    
    try {
      // Fetch real data from the canister
      const [health, stats] = await Promise.all([
        this.payoutActor.get_health(),
        this.payoutActor.get_stats(),
      ]);
      
      // Get logs
      // NOTE: Method name changed from get_recent_logs to get_logs
      const logs = await this.payoutActor.get_logs(10);
      
      // Get memory stats
      // NOTE: New method to fetch memory history
      const memoryStats = await this.payoutActor.get_memory_stats();
      
      // Format the response to match our dashboard's expected format
      return {
        health: {
          status: health.is_healthy ? "Healthy" : "Error",
          error_count: Number(health.error_count),
          warning_count: Number(health.warning_count),
          balance_status: health.balance_status,
          network_status: health.network_status,
          memory_usage_kb: Number(health.memory_usage_kb),
          memory_peak_kb: Number(health.memory_peak_kb)
        },
        stats: {
          total_holders: Number(stats.total_holders),
          active_holders: Number(stats.active_holders),
          total_payouts_processed: Number(stats.total_payouts_processed),
          processing_time_ms: Number(stats.processing_time_ms),
          success_rate: Number(stats.success_rate),
          total_payout_amount: Number(stats.total_payout_amount),
          current_network_fee: Number(stats.current_network_fee),
          average_network_fee: Number(stats.average_network_fee),
          failed_transfers: Number(stats.failed_transfers),
          is_processing: stats.is_processing,
          last_payout_time: Number(stats.last_payout_time),
          next_payout_time: Number(stats.next_payout_time)
        },
        // Format logs
        // NOTE: Log level is now a string instead of a variant
        logs: logs.map(log => ({
          timestamp: Number(log.timestamp),
          level: log.level,
          message: log.message,
          source: log.source,
          details: log.details[0] || null
        })),
        // Memory history from the canister
        // NOTE: Converting tuple format to object format
        memory_history: memoryStats.usage_history.map(entry => ({
          timestamp: Number(entry[0]),
          value: Number(entry[1])
        })),
        // Fall back to mock data for performance history
        performance_history: mockAPI.getPerformanceHistory()
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to mock data if there's an error
      return mockAPI.getAllDashboardData();
    }
  }
  
  // Process payouts
  async processPayout() {
    if (!this.isConnected) {
      console.warn('Not connected to IC, simulating payout with mock API');
      return mockAPI.simulatePayout();
    }
    
    try {
      // NOTE: Changed from returning a result to void return type
      await this.payoutActor.processPayouts();
      
      // Fetch updated stats after processing
      // NOTE: Added to retrieve results after processing
      const stats = await this.payoutActor.get_stats();
      
      return {
        success: true,
        message: `Processed payouts for ${stats.active_holders} holders`,
        tokens_distributed: Number(stats.total_payout_amount)
      };
    } catch (error) {
      console.error('Error processing payout:', error);
      return {
        success: false,
        message: `Error: ${error.message || "Unknown error"}`,
        tokens_distributed: 0
      };
    }
  }
  
  // Check if we can connect to the IC
  isInitialized() {
    return this.isConnected;
  }
  
  // Fetch holder data
  async getHolderData() {
    if (!this.isConnected) {
      return mockAPI.getHolderData();
    }
    
    try {
      const holders = await this.walletActor.get_all_holders();
      return holders.map(([principal, info]) => ({
        principal: principal.toText(),
        daku_count: Number(info.daku_count),
        gg_count: Number(info.gg_count),
        total_count: Number(info.total_count),
        last_updated: Number(info.last_updated)
      }));
    } catch (error) {
      console.error('Error fetching holder data:', error);
      return mockAPI.getHolderData();
    }
  }
  
  // Get total holders count
  async getTotalHolders() {
    if (!this.isConnected) {
      const mockData = mockAPI.getHolderData();
      return mockData.length;
    }
    
    try {
      return Number(await this.walletActor.get_total_holders());
    } catch (error) {
      console.error('Error fetching total holders:', error);
      const mockData = mockAPI.getHolderData();
      return mockData.length;
    }
  }
  
  // Check if the canister is using CSV data
  async isUsingCsvData() {
    if (!this.isConnected) {
      return true;
    }
    
    try {
      return await this.walletActor.is_using_csv_data();
    } catch (error) {
      console.error('Error checking CSV data status:', error);
      return false;
    }
  }
}

// IMPORTANT: Solved multiple default exports issue by using named exports
// Create and export as a named export
const canisterAPI = new CanisterIntegration();
export { canisterAPI };

// Export the connect function for backward compatibility
export function connectToCanister(useLocal = true) {
  return canisterAPI.initialize(useLocal);
}

/**
 * Get the current connection state
 * @returns {Object} - Connection state object
 */
export function getConnectionState() {
  return {
    isConnected: canisterState.isConnected,
    canisterId: canisterState.canisterId,
    lastError: canisterState.lastError
  };
}

/**
 * Disconnect from the canister
 */
export function disconnect() {
  canisterState.agent = null;
  canisterState.actor = null;
  canisterState.isConnected = false;
  window.canisterApi = null;
  console.log('Disconnected from canister');
}

// Export for testing
export default {
  connectToCanister,
  getConnectionState,
  disconnect
}; 