import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";

actor class Test() {
    // Get references to deployed canisters
    let payout = actor("bd3sg-teaaa-aaaaa-qaaba-cai") : actor {
        // Define the interface functions we'll test
        get_health : () -> async { 
            is_healthy: Bool; 
            last_check: Int; 
            error_count: Nat64; 
            warning_count: Nat64; 
            balance_status: Text; 
            network_status: Text;
            memory_usage_kb: Nat64;
            memory_peak_kb: Nat64;
        };
        
        get_stats : () -> async {
            last_payout_time: Int;
            next_payout_time: Int;
            total_payouts_processed: Nat64;
            total_payout_amount: Nat64;
            failed_transfers: Nat64;
            is_processing: Bool;
            average_payout_amount: Nat64;
            success_rate: Nat64;
            last_error: ?Text;
            total_holders: Nat64;
            active_holders: Nat64;
            processing_time_ms: Nat64;
            balance_status: Text;
            balance_alerts: [{
                timestamp: Int;
                alert_type: Text;
                current_balance: Nat64;
                threshold: Nat64;
                message: Text;
            }];
            current_network_fee: Nat64;
            average_network_fee: Nat64;
            fee_history: [{
                timestamp: Int;
                fee: Nat64;
                network_load: Nat64;
                success: Bool;
            }];
            batch_processing_stats: {
                total_batches: Nat64;
                successful_batches: Nat64;
                failed_batches: Nat64;
                average_batch_size: Nat64;
                average_batch_processing_time: Nat64;
                last_batch_size: Nat64;
            };
        };
        
        get_memory_stats : () -> async {
            current_usage_kb: Nat64;
            peak_usage_kb: Nat64;
            usage_history: [(Int, Nat64)];
        };

        update_memory_stats_test : () -> async {
            current_usage_kb: Nat64;
            peak_usage_kb: Nat64;
        };
    };

    // Basic health check test
    public func test_health_check() : async () {
        Debug.print("Running health check test...");
        let health = await payout.get_health();
        Debug.print("Health status: " # debug_show(health));
        
        // Check memory stats in health report
        Debug.print("Memory usage from health check: " # Nat64.toText(health.memory_usage_kb) # " KB");
        Debug.print("Memory peak from health check: " # Nat64.toText(health.memory_peak_kb) # " KB");
        
        // Log health metrics
        Debug.print("Is healthy: " # debug_show(health.is_healthy));
        Debug.print("Balance status: " # health.balance_status);
        Debug.print("Network status: " # health.network_status);
    };

    // Basic stats test
    public func test_stats() : async () {
        Debug.print("Running stats test...");
        let stats = await payout.get_stats();
        Debug.print("Stats: " # debug_show(stats));
    };
    
    // Memory usage stats test
    public func test_memory_stats() : async () {
        Debug.print("Running memory stats test...");
        
        // First check current memory stats
        Debug.print("Initial memory stats:");
        let initial_stats = await payout.get_memory_stats();
        Debug.print("Current memory usage: " # Nat64.toText(initial_stats.current_usage_kb) # " KB");
        Debug.print("Peak memory usage: " # Nat64.toText(initial_stats.peak_usage_kb) # " KB");
        Debug.print("Memory history points: " # Int.toText(initial_stats.usage_history.size()));
        
        // Force update memory stats
        Debug.print("Updating memory stats...");
        let update_result = await payout.update_memory_stats_test();
        Debug.print("Memory stats updated - current: " # Nat64.toText(update_result.current_usage_kb) # 
                    " KB, peak: " # Nat64.toText(update_result.peak_usage_kb) # " KB");
        
        // Get updated stats
        Debug.print("Getting final memory stats:");
        let final_stats = await payout.get_memory_stats();
        Debug.print("Final memory usage: " # Nat64.toText(final_stats.current_usage_kb) # " KB");
        Debug.print("Final peak memory usage: " # Nat64.toText(final_stats.peak_usage_kb) # " KB");
        Debug.print("Final memory history points: " # Int.toText(final_stats.usage_history.size()));
    };
}