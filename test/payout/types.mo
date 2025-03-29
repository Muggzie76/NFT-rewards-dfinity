/**
 * Type definitions for the load testing module and payout canister interface
 */

import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";

module {
    // Configuration for a load test
    public type LoadTestConfig = {
        // Number of test holders to generate
        holder_count : Nat;
        
        // Number of test iterations to run
        iterations : Nat;
        
        // Amount of stake per holder
        amount_per_holder : Nat;
        
        // Optional description of the test
        description : ?Text;
    };
    
    // Result of a single test iteration
    public type PerformanceResult = {
        // Iteration number
        iteration : Nat;
        
        // Whether the iteration succeeded
        success : Bool;
        
        // Processing time in milliseconds
        processing_time_ms : Nat;
        
        // Memory usage in KB
        memory_usage_kb : Nat;
        
        // Error message if the iteration failed
        error_message : ?Text;
    };
    
    // Overall result of a load test
    public type LoadTestResult = {
        // Test configuration
        configuration : LoadTestConfig;
        
        // Total duration of the test in milliseconds
        total_duration_ms : Nat;
        
        // Number of successful iterations
        success_count : Nat;
        
        // Number of failed iterations
        failure_count : Nat;
        
        // Average processing time in milliseconds
        average_processing_time_ms : Nat;
        
        // Success rate as a percentage
        success_rate_percentage : Nat;
        
        // Peak memory usage in KB
        peak_memory_usage_kb : Nat;
        
        // Results for each iteration
        iteration_results : [PerformanceResult];
        
        // Timestamp when the test was run
        timestamp : Time.Time;
    };
    
    // Interface types for the payout canister
    
    // Health status
    public type HealthStatus = {
        is_healthy : Bool;
        status : Text;
        error_count : Nat;
        warning_count : Nat;
        balance_status : Text;
        memory_usage_kb : Nat64;
        memory_peak_kb : Nat64;
        last_updated : Time.Time;
    };
    
    // Memory stats
    public type MemoryStats = {
        current_usage_kb : Nat64;
        peak_usage_kb : Nat64;
        usage_history : [(Time.Time, Nat64)]; // Timestamp and usage in KB
    };
    
    // Statistics
    public type Statistics = {
        total_payouts_processed : Nat;
        total_amount_paid : Nat;
        active_holders : Nat;
        inactive_holders : Nat;
        last_payout_time : ?Time.Time;
        next_scheduled_payout : ?Time.Time;
        average_payout_amount : Nat;
    };
    
    // Fee record
    public type FeeRecord = {
        amount : Nat;
        timestamp : Time.Time;
        transaction_id : Text;
    };
    
    // Batch stats
    public type BatchStats = {
        start_time : Time.Time;
        end_time : ?Time.Time;
        holders_processed : Nat;
        total_amount : Nat;
        success : Bool;
        error : ?Text;
    };
    
    // Balance alert
    public type BalanceAlert = {
        timestamp : Time.Time;
        balance : Nat;
        threshold : Nat;
        severity : Text;  // "warning" or "critical"
    };
    
    // Holder information
    public type HolderInfo = {
        principal : Principal;
        wallet_address : Text;
        nft_count : Nat;
        is_active : Bool;
        last_payout_time : ?Time.Time;
        total_received : Nat;
    };
    
    // Payout result
    public type PayoutResult = {
        success : Bool;
        holders_processed : Nat;
        total_amount : Nat;
        error : ?Text;
    };
    
    // Memory test result type
    public type MemoryTestResult = {
        test_name : Text;
        start_memory_kb : Nat64;
        end_memory_kb : Nat64;
        peak_memory_kb : Nat64;
        memory_growth_kb : Nat64;
        operations_performed : Nat;
        memory_per_operation : Float;
        efficiency_rating : Text;
        timestamp : Time.Time;
        details : ?Text;
        error : ?Text;
    };
    
    // Load test result type
    public type LoadTestResult = {
        test_name : Text;
        start_time : Time.Time;
        end_time : Time.Time;
        total_operations : Nat;
        successful_operations : Nat;
        failed_operations : Nat;
        average_response_time_ms : Nat;
        max_response_time_ms : Nat;
        min_response_time_ms : Nat;
        operations_per_second : Float;
        success_rate : Float;
        error_details : ?Text;
    };
    
    // Payout canister interface
    public type PayoutCanister = actor {
        // Core functionality
        processPayouts : shared () -> async PayoutResult;
        
        // Admin functions
        emergencyReset : shared () -> async ();
        
        // Query methods
        get_health : shared query () -> async HealthStatus;
        get_stats : shared query () -> async Statistics;
        get_memory_stats : shared query () -> async MemoryStats;
        
        // Test methods
        update_memory_stats_test : shared () -> async {
            current_usage_kb : Nat64;
            peak_usage_kb : Nat64;
        };
    };
}; 