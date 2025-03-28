import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Bool "mo:base/Bool";
import Int64 "mo:base/Int64";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Timer "mo:base/Timer";

shared actor class Payout {
    // Types
    private type Stats = {
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
        balance_alerts: [BalanceAlert];
        current_network_fee: Nat64;
        average_network_fee: Nat64;
        fee_history: [FeeRecord];
        batch_processing_stats: BatchStats;
    };

    private type HealthStatus = {
        is_healthy: Bool;
        last_check: Int;
        error_count: Nat64;
        warning_count: Nat64;
        balance_status: Text;
        network_status: Text;
    };

    private type PerformanceMetrics = {
        average_processing_time: Nat64;
        peak_processing_time: Nat64;
        total_cycles: Nat64;
        failed_cycles: Nat64;
        last_cycle_duration: Nat64;
    };

    private type BalanceAlert = {
        timestamp: Int;
        alert_type: Text;
        current_balance: Nat64;
        threshold: Nat64;
        message: Text;
    };

    private type BalanceThresholds = {
        critical: Nat64;  // When balance is too low to process payouts
        warning: Nat64;   // When balance is getting low
        optimal: Nat64;   // Optimal balance to maintain
    };

    private type FeeRecord = {
        timestamp: Int;
        fee: Nat64;
        network_load: Nat64;
        success: Bool;
    };

    private type NetworkLoad = {
        current_load: Nat64;      // Current network load (0-100)
        average_load: Nat64;      // Average network load
        peak_load: Nat64;         // Peak network load
        last_update: Int;         // Last load update timestamp
    };

    private type BatchStats = {
        total_batches: Nat64;
        successful_batches: Nat64;
        failed_batches: Nat64;
        average_batch_size: Nat64;
        average_batch_processing_time: Nat64;
        last_batch_size: Nat64;
    };

    // External canister IDs
    private let WALLET_CANISTER_ID = Principal.fromText("rce3q-iaaaa-aaaap-qpyfa-cai"); // Mainnet wallet canister
    private let ICZOMBIES_CANISTER_ID = Principal.fromText("rwdg7-ciaaa-aaaam-qczja-cai"); // Mainnet Zombie token canister

    // Constants
    private let PAYOUT_INTERVAL : Int = 432_000_000_000_000; // 5 days in nanoseconds
    private let NFT_VALUE : Nat64 = 2_000_000_000; // 2000 tokens per NFT (with 8 decimals)
    private var APY_PERCENT : Nat64 = 10; // 10% APY
    private let PAYOUTS_PER_YEAR : Nat64 = 73; // Every 5 days (73 payouts per year)
    private let MIN_PAYOUT_AMOUNT : Nat64 = 1_000_000; // 0.01 tokens minimum
    private let MAX_RETRIES : Nat = 3;
    private let MIN_BALANCE_THRESHOLD : Nat64 = 100_000_000; // 1 token minimum balance
    private let BASE_FEE : Nat64 = 10_000_000; // Base fee (0.1 tokens)
    private let MAX_FEE : Nat64 = 50_000_000;  // Maximum fee (0.5 tokens)
    private let MIN_FEE : Nat64 = 5_000_000;   // Minimum fee (0.05 tokens)
    private let FEE_HISTORY_SIZE : Nat = 100;  // Number of fee records to keep
    private let BATCH_SIZE : Nat = 10;         // Number of holders to process in each batch
    private let BATCH_INTERVAL : Int = 60_000_000_000; // 1 minute between batches in nanoseconds
    private let MAX_BATCHES_PER_CYCLE : Nat = 100;     // Maximum number of batches per payout cycle
    
    // Balance management constants
    private let BALANCE_THRESHOLDS : BalanceThresholds = {
        critical = 100_000_000;  // 1 token
        warning = 500_000_000;   // 5 tokens
        optimal = 1_000_000_000; // 10 tokens
    };
    
    // Admin state
    private stable var isPaused : Bool = false;
    private stable var admin : Principal = Principal.fromText("aaaaa-aa"); // Default to management canister
    
    // Error log storage
    private stable var errorLogs : [Text] = [];
    private let MAX_ERROR_LOGS : Nat = 50;
    
    // Runtime storage
    private var isProcessing : Bool = false;
    private var totalPayoutsProcessed : Nat64 = 0;
    private var totalPayoutAmount : Nat64 = 0;
    private var failedTransfers : Nat64 = 0;
    private var nextScheduledPayout : Int = 0;
    private var lastError : ?Text = null;
    private var totalHolders : Nat64 = 0;
    private var activeHolders : Nat64 = 0;
    private var processingStartTime : Int = 0;
    private var processingTimeMs : Nat64 = 0;
    private var batchStats : BatchStats = {
        total_batches = 0;
        successful_batches = 0;
        failed_batches = 0;
        average_batch_size = 0;
        average_batch_processing_time = 0;
        last_batch_size = 0;
    };
    private var lastBatchTime : Int = 0;
    private var performanceMetrics : PerformanceMetrics = {
        average_processing_time = 0;
        peak_processing_time = 0;
        total_cycles = 0;
        failed_cycles = 0;
        last_cycle_duration = 0;
    };
    private var balanceAlerts : [BalanceAlert] = [];
    private let MAX_BALANCE_ALERTS : Nat = 50;
    private var lastBalanceCheck : Int = 0;
    private let BALANCE_CHECK_INTERVAL : Int = 3600_000_000_000; // 1 hour in nanoseconds
    private var feeHistory : [FeeRecord] = [];
    private var networkLoad : NetworkLoad = {
        current_load = 0;
        average_load = 0;
        peak_load = 0;
        last_update = 0;
    };
    
    // Stable storage
    private stable var lastPayoutTime : Int = 0;
    
    // Create actors
    private let wallet = actor(Principal.toText(WALLET_CANISTER_ID)) : actor {
        get_all_holders : () -> async [(Principal, { gg_count: Nat64; daku_count: Nat64; last_updated: Nat64; total_count: Nat64 })];
        updateBalance : (Principal, Nat) -> async ();
        get_nft_count : (Principal) -> async Nat;
    };
    
    // Types for ICRC-1 token
    private type Account = {
        owner: Principal;
        subaccount: ?[Nat8];
    };

    private type TransferArg = {
        to: Account;
        fee: ?Nat;
        memo: ?[Nat8];
        from_subaccount: ?[Nat8];
        created_at_time: ?Nat64;
        amount: Nat;
    };

    private type TransferResult = {
        #Ok: Nat;
        #Err: {
            #GenericError: { message: Text; error_code: Nat };
            #TemporarilyUnavailable;
            #BadBurn: { min_burn_amount: Nat };
            #Duplicate: { duplicate_of: Nat };
            #BadFee: { expected_fee: Nat };
            #CreatedInFuture: { ledger_time: Nat64 };
            #TooOld;
            #InsufficientFunds: { balance: Nat };
        };
    };

    private type Value = {
        #Nat: Nat;
        #Int: Int;
        #Text: Text;
        #Blob: [Nat8];
        #Array: [Value];
        #Record: [(Text, Value)];
    };

    private let iczombies = actor(Principal.toText(ICZOMBIES_CANISTER_ID)) : actor {
        icrc1_transfer : shared (TransferArg) -> async TransferResult;
        icrc1_balance_of : shared query (Account) -> async Nat;
        icrc1_name : shared query () -> async Text;
        icrc1_symbol : shared query () -> async Text;
        icrc1_decimals : shared query () -> async Nat8;
        icrc1_metadata : shared query () -> async [(Text, Value)];
        icrc1_total_supply : shared query () -> async Nat;
        icrc1_fee : shared query () -> async Nat;
    };
    
    // Calculate payout amount
    private func calculatePayout(nftCount: Nat) : Nat {
        let totalValue : Nat = nftCount * Nat64.toNat(NFT_VALUE);
        Debug.print("Total value: " # formatZombieAmount(totalValue));
        let annualPayout : Nat = (totalValue * Nat64.toNat(APY_PERCENT)) / 100;
        Debug.print("Annual payout: " # formatZombieAmount(annualPayout));
        let payoutPerPeriod : Nat = annualPayout / Nat64.toNat(PAYOUTS_PER_YEAR);
        Debug.print("Payout per period: " # formatZombieAmount(payoutPerPeriod));
        payoutPerPeriod
    };

    // Enhanced monitoring functions
    private func updatePerformanceMetrics(cycleDuration: Nat64) : () {
        performanceMetrics := {
            average_processing_time = (performanceMetrics.average_processing_time * (performanceMetrics.total_cycles - 1) + cycleDuration) / (performanceMetrics.total_cycles + 1);
            peak_processing_time = if (cycleDuration > performanceMetrics.peak_processing_time) { cycleDuration } else { performanceMetrics.peak_processing_time };
            total_cycles = performanceMetrics.total_cycles + 1;
            failed_cycles = performanceMetrics.failed_cycles;
            last_cycle_duration = cycleDuration;
        };
    };

    private func calculateSuccessRate() : Nat64 {
        if (totalPayoutsProcessed == 0) { return 0 };
        let successCount = totalPayoutsProcessed - failedTransfers;
        (successCount * 100) / totalPayoutsProcessed
    };

    public shared func checkHealth() : async HealthStatus {
        let currentTime = Time.now();
        let balance = await get_balance();
        let balanceStatus = if (balance < MIN_BALANCE_THRESHOLD) {
            "LOW_BALANCE"
        } else if (balance < MIN_BALANCE_THRESHOLD * 2) {
            "WARNING"
        } else {
            "HEALTHY"
        };
        
        {
            is_healthy = not isPaused and balance >= MIN_BALANCE_THRESHOLD;
            last_check = currentTime;
            error_count = failedTransfers;
            warning_count = if (balance < MIN_BALANCE_THRESHOLD * 2) { 1 } else { 0 };
            balance_status = balanceStatus;
            network_status = "OPERATIONAL"
        }
    };

    // Enhanced logging for mainnet
    private func logMainnetEvent(event: Text) : () {
        Debug.print("[Mainnet] " # event);
        // For error reports, add to our retrievable logs
        if (Text.startsWith(event, #text "Transfer failed")) {
            lastError := ?event;
            if (errorLogs.size() >= MAX_ERROR_LOGS) {
                errorLogs := Array.tabulate<Text>(MAX_ERROR_LOGS - 1, func(i) { errorLogs[i+1] });
            };
            errorLogs := Array.append<Text>(errorLogs, [event]);
        };
    };
    
    // Admin functions
    public shared(msg) func setAdmin(newAdmin: Principal) : async () {
        assert(msg.caller == admin);
        admin := newAdmin;
    };
    
    public shared(msg) func pause() : async () {
        assert(msg.caller == admin);
        isPaused := true;
        Debug.print("Payouts paused by admin");
    };
    
    public shared(msg) func resume() : async () {
        assert(msg.caller == admin);
        isPaused := false;
        Debug.print("Payouts resumed by admin");
    };
    
    public shared(msg) func updateAPY(newAPY: Nat64) : async () {
        assert(msg.caller == admin);
        APY_PERCENT := newAPY;
        Debug.print("APY updated to: " # Nat64.toText(newAPY) # "%");
    };
    
    // Emergency stop
    public shared(msg) func emergencyStop() : async () {
        assert(msg.caller == admin);
        isPaused := true;
        isProcessing := false;
        Debug.print("Emergency stop activated by admin");
    };
    
    // Check if caller is admin
    private func isAdmin(caller: Principal) : Bool {
        caller == admin
    };
    
    // Get canister balance
    public shared func get_balance() : async Nat64 {
        let account = {
            owner = Principal.fromActor(Payout);
            subaccount = null;
        };
        let balance = await iczombies.icrc1_balance_of(account);
        Nat64.fromNat(balance)
    };
    
    // Helper function to format Zombie token amount
    private func formatZombieAmount(amount: Nat) : Text {
        let whole = amount / 100_000_000;
        let decimal = amount % 100_000_000;
        let decimalStr = Nat.toText(decimal);
        let paddedDecimal = if (decimalStr.size() < 8) {
            let zeros = "00000000";
            let paddingSize = 8 - decimalStr.size();
            let padding = if (paddingSize == 1) { "0" }
                         else if (paddingSize == 2) { "00" }
                         else if (paddingSize == 3) { "000" }
                         else if (paddingSize == 4) { "0000" }
                         else if (paddingSize == 5) { "00000" }
                         else if (paddingSize == 6) { "000000" }
                         else if (paddingSize == 7) { "0000000" }
                         else { "00000000" };
            padding # decimalStr;
        } else {
            decimalStr;
        };
        Nat.toText(whole) # "." # paddedDecimal;
    };

    // Balance management functions
    private func checkBalance() : async () {
        let currentTime = Time.now();
        if (currentTime - lastBalanceCheck < BALANCE_CHECK_INTERVAL) {
            return;
        };
        
        let balance = await get_balance();
        lastBalanceCheck := currentTime;
        
        // Check balance against thresholds
        if (balance < BALANCE_THRESHOLDS.critical) {
            addBalanceAlert("CRITICAL", balance, BALANCE_THRESHOLDS.critical, 
                "Critical: Balance below minimum threshold. Payouts will be paused.");
            isPaused := true;
        } else if (balance < BALANCE_THRESHOLDS.warning) {
            addBalanceAlert("WARNING", balance, BALANCE_THRESHOLDS.warning,
                "Warning: Balance getting low. Consider adding more funds.");
        } else if (balance > BALANCE_THRESHOLDS.optimal) {
            addBalanceAlert("INFO", balance, BALANCE_THRESHOLDS.optimal,
                "Balance is optimal for operations.");
        };
    };

    private func addBalanceAlert(alertType: Text, currentBalance: Nat64, threshold: Nat64, message: Text) : () {
        let alert = {
            timestamp = Time.now();
            alert_type = alertType;
            current_balance = currentBalance;
            threshold = threshold;
            message = message;
        };
        
        if (balanceAlerts.size() >= MAX_BALANCE_ALERTS) {
            balanceAlerts := Array.tabulate<BalanceAlert>(MAX_BALANCE_ALERTS - 1, func(i) { balanceAlerts[i+1] });
        };
        balanceAlerts := Array.append<BalanceAlert>(balanceAlerts, [alert]);
        logMainnetEvent(message);
    };

    // Fee management functions
    private func calculateDynamicFee() : async Nat64 {
        // Get current network fee from token canister
        let currentFee = await iczombies.icrc1_fee();
        
        // Calculate network load based on recent transfers
        let load = calculateNetworkLoad();
        
        // Adjust fee based on network load
        let adjustedFee = if (load.current_load > 80) {
            // High load - use maximum fee
            MAX_FEE
        } else if (load.current_load > 60) {
            // Medium-high load - increase fee by 50%
            Nat64.min(MAX_FEE, BASE_FEE * 150 / 100)
        } else if (load.current_load < 20) {
            // Low load - use minimum fee
            MIN_FEE
        } else {
            // Normal load - use base fee
            BASE_FEE
        };
        
        // Record fee
        addFeeRecord(adjustedFee, load.current_load, true);
        
        adjustedFee
    };

    private func calculateNetworkLoad() : NetworkLoad {
        let currentTime = Time.now();
        let timeSinceLastUpdate = currentTime - networkLoad.last_update;
        
        // Update network load every 5 minutes
        if (timeSinceLastUpdate > 300_000_000_000) { // 5 minutes in nanoseconds
            let recentTransfers = Array.filter<FeeRecord>(feeHistory, func(record) {
                currentTime - record.timestamp < 300_000_000_000 // Last 5 minutes
            });
            
            let load : Nat64 = if (recentTransfers.size() > 0) {
                // Calculate load based on recent transfer frequency
                let transferCount = Nat64.fromNat(recentTransfers.size());
                let averageLoad = (transferCount * 100) / 60; // 60 transfers per 5 minutes = 100% load
                Nat64.min(100, averageLoad)
            } else {
                0
            };
            
            let currentLoad = networkLoad.current_load;
            let avgLoad = networkLoad.average_load;
            let peakLoad = networkLoad.peak_load;
            
            let newAverageLoad = (avgLoad * 7 + load) / 8; // Moving average
            let newPeakLoad = if (load > peakLoad) { load } else { peakLoad };
            
            networkLoad := {
                current_load = load;
                average_load = newAverageLoad;
                peak_load = newPeakLoad;
                last_update = currentTime;
            };
        };
        
        networkLoad
    };

    private func addFeeRecord(fee: Nat64, load: Nat64, success: Bool) : () {
        let record = {
            timestamp = Time.now();
            fee = fee;
            network_load = load;
            success = success;
        };
        
        if (feeHistory.size() >= FEE_HISTORY_SIZE) {
            feeHistory := Array.tabulate<FeeRecord>(FEE_HISTORY_SIZE - 1, func(i) { feeHistory[i+1] });
        };
        feeHistory := Array.append<FeeRecord>(feeHistory, [record]);
    };

    // Batch processing functions
    private func processBatch(holders: [(Principal, { gg_count: Nat64; daku_count: Nat64; last_updated: Nat64; total_count: Nat64 })], 
                            startIndex: Nat, 
                            currentFee: Nat64) : async (Nat64, Nat64, Nat64) {
        let batchStartTime = Time.now();
        var batchPayoutsProcessed : Nat64 = 0;
        var batchPayoutAmount : Nat64 = 0;
        var batchFailedTransfers : Nat64 = 0;
        
        let endIndex = Nat.min(startIndex + BATCH_SIZE, holders.size());
        let batchSize = endIndex - startIndex;
        
        for (i in Iter.range(startIndex, endIndex - 1)) {
            let (holder, holderInfo) = holders[i];
            let nftCount = Nat64.toNat(holderInfo.total_count);
            
            if (nftCount > 0) {
                let payoutAmount = calculatePayout(nftCount);
                if (payoutAmount >= Nat64.toNat(MIN_PAYOUT_AMOUNT)) {
                    let (success, processed, amount, failed) = await processHolderPayout(
                        holder, 
                        nftCount, 
                        payoutAmount, 
                        currentFee
                    );
                    
                    if (success) {
                        batchPayoutsProcessed += processed;
                        batchPayoutAmount += amount;
                        batchFailedTransfers += failed;
                    };
                };
            };
        };
        
        let batchDuration = Nat64.fromNat(Int.abs(Time.now() - batchStartTime));
        updateBatchStats(batchSize, batchDuration, batchFailedTransfers == 0);
        
        (batchPayoutsProcessed, batchPayoutAmount, batchFailedTransfers)
    };

    private func processHolderPayout(holder: Principal, 
                                   nftCount: Nat, 
                                   payoutAmount: Nat, 
                                   currentFee: Nat64) : async (Bool, Nat64, Nat64, Nat64) {
        var retryCount = 0;
        var success = false;
        var processed : Nat64 = 0;
        var amount : Nat64 = 0;
        var failed : Nat64 = 0;
        
        while (not success and retryCount < MAX_RETRIES) {
            try {
                let result = await iczombies.icrc1_transfer({
                    to = {
                        owner = holder;
                        subaccount = null;
                    };
                    fee = ?Nat64.toNat(currentFee);
                    memo = null;
                    from_subaccount = null;
                    created_at_time = null;
                    amount = payoutAmount;
                });
                
                switch (result) {
                    case (#Ok(txId)) {
                        logMainnetEvent("Transfer successful for " # Principal.toText(holder) # ". TxId: " # Nat.toText(txId));
                        success := true;
                        processed := 1;
                        amount := Nat64.fromNat(payoutAmount);
                        addFeeRecord(currentFee, networkLoad.current_load, true);
                    };
                    case (#Err(e)) {
                        handleTransferError(e, holder, payoutAmount, currentFee);
                        failed := 1;
                    };
                };
            } catch (e) {
                Debug.print("Error during transfer: " # Error.message(e));
                retryCount += 1;
            };
        };
        
        (success, processed, amount, failed)
    };

    private func handleTransferError(error: {
        #GenericError: { message: Text; error_code: Nat };
        #TemporarilyUnavailable;
        #BadBurn: { min_burn_amount: Nat };
        #Duplicate: { duplicate_of: Nat };
        #BadFee: { expected_fee: Nat };
        #CreatedInFuture: { ledger_time: Nat64 };
        #TooOld;
        #InsufficientFunds: { balance: Nat };
    }, holder: Principal, amount: Nat, fee: Nat64) : () {
        switch (error) {
            case (#InsufficientFunds(balanceInfo)) {
                logMainnetEvent("Transfer failed: Insufficient funds. Balance: " # Nat.toText(balanceInfo.balance));
            };
            case (#BadFee(feeInfo)) {
                logMainnetEvent("Transfer failed: Bad fee. Expected: " # Nat.toText(feeInfo.expected_fee));
                addFeeRecord(Nat64.fromNat(feeInfo.expected_fee), networkLoad.current_load, false);
            };
            case (#BadBurn(burnInfo)) {
                logMainnetEvent("Transfer failed: Bad burn. Min amount: " # Nat.toText(burnInfo.min_burn_amount));
            };
            case (#CreatedInFuture(timeInfo)) {
                logMainnetEvent("Transfer failed: Created in future. Ledger time: " # Nat64.toText(timeInfo.ledger_time));
            };
            case (#TooOld) {
                logMainnetEvent("Transfer failed: Transaction too old");
            };
            case (#Duplicate(dupInfo)) {
                logMainnetEvent("Transfer failed: Duplicate transaction. Duplicate of: " # Nat.toText(dupInfo.duplicate_of));
            };
            case (#TemporarilyUnavailable) {
                logMainnetEvent("Transfer failed: Temporarily unavailable");
            };
            case (#GenericError(errInfo)) {
                logMainnetEvent("Transfer failed: " # errInfo.message # " (Code: " # Nat.toText(errInfo.error_code) # ")");
            };
        };
        addFeeRecord(fee, networkLoad.current_load, false);
    };

    private func updateBatchStats(batchSize: Nat, processingTime: Nat64, success: Bool) : () {
        let totalBatches = batchStats.total_batches + 1;
        let successfulBatches = if (success) { batchStats.successful_batches + 1 } else { batchStats.successful_batches };
        let failedBatches = if (not success) { batchStats.failed_batches + 1 } else { batchStats.failed_batches };
        let batchSizeNat64 = Nat64.fromNat(batchSize);
        let currentTotalBatches = batchStats.total_batches;
        let newAverageBatchSize = (batchStats.average_batch_size * currentTotalBatches + batchSizeNat64) / totalBatches;
        let newAverageProcessingTime = (batchStats.average_batch_processing_time * currentTotalBatches + processingTime) / totalBatches;
        
        batchStats := {
            total_batches = totalBatches;
            successful_batches = successfulBatches;
            failed_batches = failedBatches;
            average_batch_size = newAverageBatchSize;
            average_batch_processing_time = newAverageProcessingTime;
            last_batch_size = batchSizeNat64;
        };
    };

    private func waitForNextBatch(currentTime: Int, lastBatchTime: Int) : async () {
        let timeSinceLastBatch = currentTime - lastBatchTime;
        if (timeSinceLastBatch < BATCH_INTERVAL) {
            let waitTime = BATCH_INTERVAL - timeSinceLastBatch;
            let waitStart = Time.now();
            var waited = false;
            
            while (not waited) {
                let currentWaitTime = Time.now() - waitStart;
                if (currentWaitTime >= waitTime) {
                    waited := true;
                };
            };
        };
    };

    // Process payouts with optimizations
    public shared func processPayouts() : async () {
        if (isProcessing) {
            logMainnetEvent("Payout already in progress");
            return;
        };
        
        if (isPaused) {
            logMainnetEvent("Payouts are currently paused");
            return;
        };

        // Check balance before processing
        await checkBalance();
        if (isPaused) {
            logMainnetEvent("Payouts paused due to low balance");
            return;
        };

        processingStartTime := Time.now();
        isProcessing := true;
        var currentTime = Time.now();
        var localPayoutsProcessed : Nat64 = 0;
        var localPayoutAmount : Nat64 = 0;
        var localFailedTransfers : Nat64 = 0;
        var batchCount = 0;
        var localBatchStats = {
            total_batches = 0;
            successful_batches = 0;
            failed_batches = 0;
            average_batch_size = 0;
            average_batch_processing_time = 0;
            last_batch_size = 0;
        };
        var localLastBatchTime = lastBatchTime;

        try {
            // Get all holders from wallet canister
            var holders = await wallet.get_all_holders();
            Debug.print("Found " # Nat.toText(holders.size()) # " holders to process");

            // Validate holders list
            if (holders.size() == 0) {
                logMainnetEvent("No holders found in the current cycle. Skipping payout process.");
                return;
            };

            // Calculate dynamic fee for this batch
            let currentFee = await calculateDynamicFee();
            logMainnetEvent("Using dynamic fee: " # formatZombieAmount(Nat64.toNat(currentFee)) # " ZOMB");

            // Process holders in batches
            var currentIndex = 0;
            while (currentIndex < holders.size() and batchCount < MAX_BATCHES_PER_CYCLE) {
                // Wait for next batch if needed
                await waitForNextBatch(currentTime, localLastBatchTime);
                
                let (processed, amount, failed) = await processBatch(holders, currentIndex, currentFee);
                localPayoutsProcessed += processed;
                localPayoutAmount += amount;
                localFailedTransfers += failed;
                
                currentIndex += BATCH_SIZE;
                batchCount += 1;
                localLastBatchTime := Time.now();
                currentTime := Time.now();
            };

            // Update global stats
            totalPayoutsProcessed += localPayoutsProcessed;
            totalPayoutAmount += localPayoutAmount;
            failedTransfers += localFailedTransfers;
            batchStats := {
                total_batches = Nat64.fromNat(localBatchStats.total_batches);
                successful_batches = Nat64.fromNat(localBatchStats.successful_batches);
                failed_batches = Nat64.fromNat(localBatchStats.failed_batches);
                average_batch_size = Nat64.fromNat(localBatchStats.average_batch_size);
                average_batch_processing_time = Nat64.fromNat(localBatchStats.average_batch_processing_time);
                last_batch_size = Nat64.fromNat(localBatchStats.last_batch_size);
            };
            lastBatchTime := localLastBatchTime;
            
            // Update last payout time and stats
            lastPayoutTime := currentTime;
            nextScheduledPayout := currentTime + PAYOUT_INTERVAL;
            
            // Update performance metrics
            let cycleDuration = Nat64.fromNat(Int.abs(currentTime - processingStartTime));
            updatePerformanceMetrics(cycleDuration);
            
            // Log final stats
            Debug.print("Payout completed. Processed " # Nat64.toText(localPayoutsProcessed) # 
                " holders in " # Nat.toText(batchCount) # " batches, total amount: " # 
                formatZombieAmount(Nat64.toNat(localPayoutAmount)) # " Zombie tokens, failed transfers: " # 
                Nat64.toText(localFailedTransfers) # ", processing time: " # Nat64.toText(cycleDuration) # "ms");
        } catch (e) {
            lastError := ?Error.message(e);
            Debug.print("Error during payout process: " # Error.message(e));
        } finally {
            isProcessing := false;
            processingTimeMs := Nat64.fromNat(Int.abs(Time.now() - processingStartTime));
        };
    };
    
    // Get enhanced stats
    public shared func get_stats() : async Stats {
        let currentBalance = await get_balance();
        let currentFee = await calculateDynamicFee();
        {
            last_payout_time = lastPayoutTime;
            next_payout_time = nextScheduledPayout;
            total_payouts_processed = totalPayoutsProcessed;
            total_payout_amount = totalPayoutAmount;
            failed_transfers = failedTransfers;
            is_processing = isProcessing;
            average_payout_amount = if (totalPayoutsProcessed > 0) {
                totalPayoutAmount / totalPayoutsProcessed
            } else { 0 };
            success_rate = calculateSuccessRate();
            last_error = lastError;
            total_holders = totalHolders;
            active_holders = activeHolders;
            processing_time_ms = processingTimeMs;
            balance_status = if (currentBalance < BALANCE_THRESHOLDS.critical) { "CRITICAL" }
                           else if (currentBalance < BALANCE_THRESHOLDS.warning) { "WARNING" }
                           else { "HEALTHY" };
            balance_alerts = balanceAlerts;
            current_network_fee = currentFee;
            average_network_fee = if (feeHistory.size() > 0) {
                let totalFee = Array.foldLeft<FeeRecord, Nat64>(feeHistory, 0, func(acc, record) { acc + record.fee });
                totalFee / Nat64.fromNat(feeHistory.size())
            } else { currentFee };
            fee_history = feeHistory;
            batch_processing_stats = batchStats;
        }
    };

    // Get health status
    public shared func get_health() : async HealthStatus {
        await checkHealth()
    };

    // Get performance metrics
    public query func get_performance_metrics() : async PerformanceMetrics {
        performanceMetrics
    };

    // Emergency reset for stuck processing state
    public shared func emergencyReset() : async () {
        isProcessing := false;
        logMainnetEvent("Emergency reset executed. Processing state reset to false.");
    };

    // Test payout to specific address
    public shared func testDirectPayout() : async () {
        let testAddress = Principal.fromText("ld5uj-tgxfi-jgmdx-ikekg-uu62k-dhhrf-s6jav-3sdbh-4yamx-yzwrs-pqe");
        let payoutAmount : Nat = 100_000_000; // 1 token for testing
        
        logMainnetEvent("Testing direct payout to " # Principal.toText(testAddress) # " with amount " # formatZombieAmount(payoutAmount));
        
        try {
            let result = await iczombies.icrc1_transfer({
                to = {
                    owner = testAddress;
                    subaccount = null;
                };
                fee = null; // Let the token canister decide the fee
                memo = null;
                from_subaccount = null;
                created_at_time = null;
                amount = payoutAmount;
            });
            
            switch (result) {
                case (#Ok(txId)) {
                    logMainnetEvent("Test transfer successful. TxId: " # Nat.toText(txId));
                };
                case (#Err(e)) {
                    switch (e) {
                        case (#InsufficientFunds(balanceInfo)) {
                            logMainnetEvent("Test transfer failed: Insufficient funds. Balance: " # Nat.toText(balanceInfo.balance));
                        };
                        case (#BadFee(feeInfo)) {
                            logMainnetEvent("Test transfer failed: Bad fee. Expected: " # Nat.toText(feeInfo.expected_fee));
                        };
                        case (#BadBurn(burnInfo)) {
                            logMainnetEvent("Test transfer failed: Bad burn. Min amount: " # Nat.toText(burnInfo.min_burn_amount));
                        };
                        case (#CreatedInFuture(timeInfo)) {
                            logMainnetEvent("Test transfer failed: Created in future. Ledger time: " # Nat64.toText(timeInfo.ledger_time));
                        };
                        case (#TooOld) {
                            logMainnetEvent("Test transfer failed: Transaction too old");
                        };
                        case (#Duplicate(dupInfo)) {
                            logMainnetEvent("Test transfer failed: Duplicate transaction. Duplicate of: " # Nat.toText(dupInfo.duplicate_of));
                        };
                        case (#TemporarilyUnavailable) {
                            logMainnetEvent("Test transfer failed: Temporarily unavailable");
                        };
                        case (#GenericError(errInfo)) {
                            logMainnetEvent("Test transfer failed: " # errInfo.message # " (Code: " # Nat.toText(errInfo.error_code) # ")");
                        };
                    };
                };
            };
        } catch (e) {
            logMainnetEvent("Error during test transfer: " # Error.message(e));
        };
    };
    
    // Get error logs for debugging
    public query func getErrorLogs() : async [Text] {
        errorLogs
    };

    // Get balance alerts
    public query func get_balance_alerts() : async [BalanceAlert] {
        balanceAlerts
    };

    // Get balance thresholds
    public query func get_balance_thresholds() : async BalanceThresholds {
        BALANCE_THRESHOLDS
    };

    // Get current balance status
    public shared func get_balance_status() : async Text {
        let currentBalance = await get_balance();
        if (currentBalance < BALANCE_THRESHOLDS.critical) { "CRITICAL" }
        else if (currentBalance < BALANCE_THRESHOLDS.warning) { "WARNING" }
        else { "HEALTHY" }
    };

    // Get network load
    public query func get_network_load() : async NetworkLoad {
        networkLoad
    };

    // Get fee history
    public query func get_fee_history() : async [FeeRecord] {
        feeHistory
    };
} 