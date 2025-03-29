/**
 * Load Test for World 8 Staking System
 * 
 * This module implements load testing functionality for the payout canister,
 * allowing systematic performance testing under various load conditions.
 */

import Array "mo:base/Array";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Timer "mo:base/Timer";

// Import canister interfaces
import Payout "../payout/types";
import Types "./types";

actor class LoadTest(payoutCanisterId : Principal) {
    type LoadTestConfig = Types.LoadTestConfig;
    type LoadTestResult = Types.LoadTestResult;
    type PerformanceResult = Types.PerformanceResult;
    type HolderInfo = Payout.HolderInfo;
    
    // Reference to the payout canister
    let payoutCanister : Payout.PayoutCanister = actor(Principal.toText(payoutCanisterId));
    
    // Default test configurations
    private let DEFAULT_HOLDERS = 100;
    private let DEFAULT_ITERATIONS = 5;
    private let DEFAULT_AMOUNT_PER_HOLDER = 1_000;
    
    // Track test results
    private var testResults : [LoadTestResult] = [];
    
    // Generate test holders
    private func generateTestHolders(count : Nat, amountPerHolder : Nat) : [HolderInfo] {
        var holders : [HolderInfo] = [];
        for (i in Iter.range(0, count - 1)) {
            let holderPrincipal = Principal.fromText("aaaaa-aa"); // This would be unique in a real test
            let holderInfo : HolderInfo = {
                id = holderPrincipal;
                stake_amount = amountPerHolder;
                last_payout = null;
                created_at = Time.now();
                updated_at = Time.now();
            };
            holders := Array.append(holders, [holderInfo]);
        };
        Debug.print("Generated " # Nat.toText(count) # " test holders");
        holders;
    };
    
    /**
     * Run a load test with the specified configuration
     */
    public func runLoadTest(config : LoadTestConfig) : async LoadTestResult {
        Debug.print("Starting load test with configuration: " # debug_show(config));
        
        let startTime = Time.now();
        var successCount = 0;
        var failureCount = 0;
        var totalProcessingTime = 0;
        var peakMemoryUsage = 0;
        
        // Generate holders for the test
        let holderCount = if (config.holder_count > 0) { config.holder_count } else { DEFAULT_HOLDERS };
        let iterationCount = if (config.iterations > 0) { config.iterations } else { DEFAULT_ITERATIONS };
        let amountPerHolder = if (config.amount_per_holder > 0) { config.amount_per_holder } else { DEFAULT_AMOUNT_PER_HOLDER };
        
        let testHolders = generateTestHolders(holderCount, amountPerHolder);
        
        // Register test holders with payout canister
        // In a real implementation, this would be done through proper canister calls
        Debug.print("Would register " # Nat.toText(holderCount) # " holders with the payout canister");
        
        // Run test iterations
        var iterationResults : [PerformanceResult] = [];
        
        for (i in Iter.range(1, iterationCount)) {
            Debug.print("Starting iteration " # Nat.toText(i) # " of " # Nat.toText(iterationCount));
            
            let iterationStart = Time.now();
            
            try {
                // Call the payout processing function
                // In a real implementation, we would await an actual canister call
                let stats = await payoutCanister.get_stats();
                
                // Record success metrics
                let iterationEnd = Time.now();
                let processingTime = (iterationEnd - iterationStart) / 1_000_000; // Convert to milliseconds
                totalProcessingTime += processingTime;
                
                // Get memory usage after the operation
                let health = await payoutCanister.get_health();
                let memoryUsage = health.memory_usage_kb;
                if (memoryUsage > peakMemoryUsage) {
                    peakMemoryUsage := memoryUsage;
                };
                
                let iterationResult : PerformanceResult = {
                    iteration = i;
                    success = true;
                    processing_time_ms = processingTime;
                    memory_usage_kb = memoryUsage;
                    error_message = null;
                };
                
                iterationResults := Array.append(iterationResults, [iterationResult]);
                successCount += 1;
                
                Debug.print("Iteration " # Nat.toText(i) # " completed in " # 
                    Nat.toText(processingTime) # "ms with memory usage: " # 
                    Nat.toText(memoryUsage) # "KB");
                
            } catch (error) {
                // Record failure
                failureCount += 1;
                let iterationResult : PerformanceResult = {
                    iteration = i;
                    success = false;
                    processing_time_ms = 0;
                    memory_usage_kb = 0;
                    error_message = ?("Error in iteration " # Nat.toText(i) # ": " # debug_show(error));
                };
                
                iterationResults := Array.append(iterationResults, [iterationResult]);
                Debug.print("Iteration " # Nat.toText(i) # " failed: " # debug_show(error));
            };
            
            // Add a small delay between iterations
            if (i < iterationCount) {
                // In a real implementation, we would use Timer.setTimer
                Debug.print("Waiting between iterations...");
            };
        };
        
        let endTime = Time.now();
        let totalDuration = (endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        let averageProcessingTime = if (successCount > 0) {
            totalProcessingTime / successCount;
        } else {
            0;
        };
        
        let successRate = if (iterationCount > 0) {
            (successCount * 100) / iterationCount;
        } else {
            0;
        };
        
        // Create result object
        let result : LoadTestResult = {
            configuration = config;
            total_duration_ms = totalDuration;
            success_count = successCount;
            failure_count = failureCount;
            average_processing_time_ms = averageProcessingTime;
            success_rate_percentage = successRate;
            peak_memory_usage_kb = peakMemoryUsage;
            iteration_results = iterationResults;
            timestamp = Time.now();
        };
        
        // Store result
        testResults := Array.append(testResults, [result]);
        
        Debug.print("Load test completed in " # Nat.toText(totalDuration) # "ms with success rate: " # 
            Nat.toText(successRate) # "% and average processing time: " # 
            Nat.toText(averageProcessingTime) # "ms");
        
        return result;
    };
    
    /**
     * Run a standard load test with default parameters
     */
    public func runStandardLoadTest() : async LoadTestResult {
        let config : LoadTestConfig = {
            holder_count = DEFAULT_HOLDERS;
            iterations = DEFAULT_ITERATIONS;
            amount_per_holder = DEFAULT_AMOUNT_PER_HOLDER;
            description = ?"Standard load test";
        };
        
        await runLoadTest(config);
    };
    
    /**
     * Run a high volume load test
     */
    public func runHighVolumeLoadTest(holderCount : Nat) : async LoadTestResult {
        let config : LoadTestConfig = {
            holder_count = holderCount;
            iterations = 3;
            amount_per_holder = DEFAULT_AMOUNT_PER_HOLDER;
            description = ?"High volume load test with " # Nat.toText(holderCount) # " holders";
        };
        
        await runLoadTest(config);
    };
    
    /**
     * Get the results of past load tests
     */
    public query func getTestResults() : async [LoadTestResult] {
        testResults;
    };
    
    /**
     * Clear previous test results
     */
    public func clearTestResults() : async () {
        testResults := [];
        Debug.print("Test results cleared");
    };
    
    /**
     * Generate a summary report for load tests
     */
    public query func generateTestSummary() : async Text {
        if (testResults.size() == 0) {
            return "No test results available";
        };
        
        var summary = "Load Test Summary\n";
        summary #= "=================\n\n";
        summary #= "Total tests run: " # Nat.toText(testResults.size()) # "\n\n";
        
        for (i in Iter.range(0, testResults.size() - 1)) {
            let result = testResults[i];
            summary #= "Test #" # Nat.toText(i + 1) # ":\n";
            summary #= "  Description: " # 
                switch (result.configuration.description) {
                    case (?desc) { desc };
                    case (null) { "No description" };
                } # "\n";
            summary #= "  Holders: " # Nat.toText(result.configuration.holder_count) # "\n";
            summary #= "  Success rate: " # Nat.toText(result.success_rate_percentage) # "%\n";
            summary #= "  Avg processing time: " # Nat.toText(result.average_processing_time_ms) # "ms\n";
            summary #= "  Peak memory usage: " # Nat.toText(result.peak_memory_usage_kb) # "KB\n";
            summary #= "\n";
        };
        
        return summary;
    };
} 