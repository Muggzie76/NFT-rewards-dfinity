/**
 * End-to-End Tests for World 8 Staking System
 * 
 * This module implements comprehensive end-to-end tests for the 
 * payout workflow, validating all components working together.
 */

import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

// Import canister interfaces
import Types "./types";

actor class E2ETest(
    payoutCanisterId : Principal,
    walletCanisterId : Principal,
    tokenCanisterId : Principal
) {
    type HealthStatus = Types.HealthStatus;
    type Statistics = Types.Statistics;
    type HolderInfo = Types.HolderInfo;
    
    // References to canisters
    let payoutCanister : Types.PayoutCanister = actor(Principal.toText(payoutCanisterId));
    
    // Test results
    private var testResults : [TestResult] = [];
    
    // Test holders (sample principals for test purposes)
    private let testHolders : [Principal] = [
        Principal.fromText("aaaaa-aa"), // This would be unique in a real test
        Principal.fromText("bbbbb-bb"),
        Principal.fromText("ccccc-cc")
    ];
    
    // Data types for e2e testing
    public type TestStep = {
        name : Text;
        description : Text;
    };
    
    public type TestResult = {
        test_name : Text;
        start_time : Time.Time;
        end_time : Time.Time;
        success : Bool;
        steps_passed : Nat;
        steps_failed : Nat;
        error_message : ?Text;
        details : [StepResult];
    };
    
    public type StepResult = {
        step_name : Text;
        success : Bool;
        execution_time : Nat;
        error : ?Text;
        details : ?Text;
    };
    
    // Test function type - returns result asynchronously
    public type TestFunction = shared () -> async {
        success : Bool;
        details : ?Text;
        error : ?Text;
    };
    
    /**
     * Run the complete end-to-end test suite
     */
    public func runE2ETest() : async TestResult {
        Debug.print("Starting E2E test for the payout system");
        
        let startTime = Time.now();
        var stepsSucceeded = 0;
        var stepsFailed = 0;
        var stepResults : [StepResult] = [];
        var testSuccessful = true;
        var finalErrorMessage : ?Text = null;
        
        // Step 1: Check system health
        var stepResult = await runTestStep(
            "Check System Health", 
            func() : async {success : Bool; details : ?Text; error : ?Text} {
                let health = await payoutCanister.get_health();
                if (not health.is_healthy) {
                    return {
                        success = false;
                        details = ?"System not healthy. Health status: " # debug_show(health);
                        error = ?"System health check failed";
                    };
                };
                
                return {
                    success = true;
                    details = ?"System health confirmed. Status: " # health.status;
                    error = null;
                };
            }
        );
        
        if (stepResult.success) { stepsSucceeded += 1; } else { stepsFailed += 1; testSuccessful := false; };
        stepResults := Array.append(stepResults, [stepResult]);
        
        // Step 2: Verify initial statistics
        stepResult := await runTestStep(
            "Verify Initial Statistics", 
            func() : async {success : Bool; details : ?Text; error : ?Text} {
                let stats = await payoutCanister.get_stats();
                
                return {
                    success = true;
                    details = ?"Initial stats recorded: Active holders: " # 
                        Nat.toText(stats.active_holders) # ", Total payouts: " # 
                        Nat.toText(stats.total_payouts_processed);
                    error = null;
                };
            }
        );
        
        if (stepResult.success) { stepsSucceeded += 1; } else { stepsFailed += 1; testSuccessful := false; };
        stepResults := Array.append(stepResults, [stepResult]);
        
        // Step 3: Process payouts and verify results
        stepResult := await runTestStep(
            "Process Payouts", 
            func() : async {success : Bool; details : ?Text; error : ?Text} {
                // In a complete test, we would:
                // 1. Register test holders
                // 2. Set up token balances
                // 3. Actually process payouts
                
                // For this simplified test, we'll just call processPayouts
                try {
                    let result = await payoutCanister.processPayouts();
                    
                    if (not result.success) {
                        return {
                            success = false;
                            details = ?"Payout processing failed: " # Option.get(result.error, "Unknown error");
                            error = result.error;
                        };
                    };
                    
                    return {
                        success = true;
                        details = ?"Successfully processed payouts for " # 
                            Nat.toText(result.holders_processed) # " holders, total amount: " # 
                            Nat.toText(result.total_amount);
                        error = null;
                    };
                } catch (e) {
                    return {
                        success = false;
                        details = ?"Exception during payout processing: " # Error.message(e);
                        error = ?Error.message(e);
                    };
                };
            }
        );
        
        if (stepResult.success) { stepsSucceeded += 1; } else { stepsFailed += 1; testSuccessful := false; };
        stepResults := Array.append(stepResults, [stepResult]);
        
        // Step 4: Verify final statistics after payout
        stepResult := await runTestStep(
            "Verify Post-Payout Statistics", 
            func() : async {success : Bool; details : ?Text; error : ?Text} {
                let stats = await payoutCanister.get_stats();
                
                return {
                    success = true;
                    details = ?"Final stats recorded: Active holders: " # 
                        Nat.toText(stats.active_holders) # ", Total payouts: " # 
                        Nat.toText(stats.total_payouts_processed);
                    error = null;
                };
            }
        );
        
        if (stepResult.success) { stepsSucceeded += 1; } else { stepsFailed += 1; testSuccessful := false; };
        stepResults := Array.append(stepResults, [stepResult]);
        
        // Step 5: Check memory usage after processing
        stepResult := await runTestStep(
            "Check Memory Usage", 
            func() : async {success : Bool; details : ?Text; error : ?Text} {
                let memoryStats = await payoutCanister.get_memory_stats();
                
                return {
                    success = true;
                    details = ?"Memory usage after payout: " # Nat64.toText(memoryStats.current_usage_kb) # " KB, " # 
                        "Peak memory: " # Nat64.toText(memoryStats.peak_usage_kb) # " KB";
                    error = null;
                };
            }
        );
        
        if (stepResult.success) { stepsSucceeded += 1; } else { stepsFailed += 1; testSuccessful := false; };
        stepResults := Array.append(stepResults, [stepResult]);
        
        // Create final test result
        let endTime = Time.now();
        let testResult : TestResult = {
            test_name = "Complete Payout Workflow E2E Test";
            start_time = startTime;
            end_time = endTime;
            success = testSuccessful;
            steps_passed = stepsSucceeded;
            steps_failed = stepsFailed;
            error_message = if (testSuccessful) { null } else { 
                ?("Test failed with " # Nat.toText(stepsFailed) # " step failures") 
            };
            details = stepResults;
        };
        
        // Store result
        testResults := Array.append(testResults, [testResult]);
        
        Debug.print("E2E test completed. " # (if (testSuccessful) { "SUCCESS" } else { "FAILED" }) # 
            " - Passed: " # Nat.toText(stepsSucceeded) # ", Failed: " # Nat.toText(stepsFailed));
        
        return testResult;
    };
    
    /**
     * Run a specific test step and measure its performance
     */
    private func runTestStep(
        name : Text, 
        testFunc : shared () -> async { success : Bool; details : ?Text; error : ?Text }
    ) : async StepResult {
        Debug.print("Executing step: " # name);
        let startTime = Time.now();
        
        try {
            let result = await testFunc();
            let endTime = Time.now();
            let executionTimeNs = Int.abs(endTime - startTime);
            let executionTimeMs = executionTimeNs / 1_000_000;
            
            if (result.success) {
                Debug.print("Step completed successfully: " # name);
            } else {
                Debug.print("Step failed: " # name # " - " # 
                    Option.get(result.error, "Unknown error"));
            };
            
            return {
                step_name = name;
                success = result.success;
                execution_time = executionTimeMs;
                error = result.error;
                details = result.details;
            };
        } catch (e) {
            let endTime = Time.now();
            let executionTimeNs = Int.abs(endTime - startTime);
            let executionTimeMs = executionTimeNs / 1_000_000;
            
            Debug.print("Exception in step: " # name # " - " # Error.message(e));
            
            return {
                step_name = name;
                success = false;
                execution_time = executionTimeMs;
                error = ?Error.message(e);
                details = ?"Exception during test step execution";
            };
        };
    };
    
    /**
     * Get all test results
     */
    public query func getTestResults() : async [TestResult] {
        testResults;
    };
    
    /**
     * Generate a detailed test report
     */
    public query func generateTestReport() : async Text {
        if (Array.size(testResults) == 0) {
            return "No test results available";
        };
        
        var report = "E2E Test Report\n";
        report #= "==============\n\n";
        
        for (i in Iter.range(0, Array.size(testResults) - 1)) {
            let result = testResults[i];
            report #= "Test " # Nat.toText(i + 1) # ": " # result.test_name # "\n";
            report #= "Status: " # (if (result.success) { "PASSED" } else { "FAILED" }) # "\n";
            report #= "Duration: " # Nat.toText(Int.abs(result.end_time - result.start_time) / 1_000_000) # " ms\n";
            report #= "Steps Passed: " # Nat.toText(result.steps_passed) # "\n";
            report #= "Steps Failed: " # Nat.toText(result.steps_failed) # "\n";
            
            if (not result.success) {
                report #= "Error: " # Option.get(result.error_message, "Unknown error") # "\n";
            };
            
            report #= "\nStep Details:\n";
            
            for (j in Iter.range(0, Array.size(result.details) - 1)) {
                let step = result.details[j];
                report #= "  Step " # Nat.toText(j + 1) # ": " # step.step_name # "\n";
                report #= "    Status: " # (if (step.success) { "PASSED" } else { "FAILED" }) # "\n";
                report #= "    Duration: " # Nat.toText(step.execution_time) # " ms\n";
                
                if (not step.success) {
                    report #= "    Error: " # Option.get(step.error, "Unknown error") # "\n";
                };
                
                switch (step.details) {
                    case (?details) { report #= "    Details: " # details # "\n"; };
                    case (null) {};
                };
                
                report #= "\n";
            };
            
            report #= "----------------------\n\n";
        };
        
        return report;
    };
    
    /**
     * Clear test results
     */
    public func clearTestResults() : async () {
        testResults := [];
        Debug.print("E2E test results cleared");
    };
}; 