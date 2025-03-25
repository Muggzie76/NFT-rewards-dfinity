import Principal "mo:base/Principal";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Error "mo:base/Error";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Bool "mo:base/Bool";
import List "mo:base/List";
import Timer "mo:base/Timer";
import Int64 "mo:base/Int64";
import Float "mo:base/Float";
import Buffer "mo:base/Buffer";
import P "mo:base/Prelude";
import Prim "mo:prim";

actor Payout {
    // Types
    private type UserStats = {
        nft_count: Nat64;
        last_payout_amount: Nat64;
        last_payout_time: Int;
        total_payouts_received: Nat64;
    };

    private type Stats = {
        total_registered_users: Nat64;
        last_payout_time: Int;
        next_payout_time: Int;
        total_payouts_processed: Nat64;
        total_payout_amount: Nat64;
        failed_transfers: Nat64;
        is_processing: Bool;
    };

    // Cache types
    private type NFTCache = {
        count: Nat;
        timestamp: Int;
    };

    // External canister IDs
    private let WALLET_CANISTER_ID = Principal.fromText("rce3q-iaaaa-aaaap-qpyfa-cai");
    private let ICP_LEDGER_CANISTER_ID = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

    // Constants
    private let TRANSFER_FEE : Nat = 10_000;
    private let _MIN_PROCESS_INTERVAL = 60_000_000_000;
    private let STORAGE_UPDATE_INTERVAL : Int = 3600_000_000_000;
    private let PAYOUT_INTERVAL : Int = 432_000_000_000_000;
    private let NFT_VALUE : Nat = 1_000;
    private let APY_PERCENT : Nat = 10;
    private let PAYOUTS_PER_YEAR : Nat = 73;
    private let _MAX_BATCH_SIZE = 100;
    private let MAX_RETRIES = 3;
    private let _RETRY_DELAY = 1_000_000_000;
    private let CACHE_DURATION = 86400_000_000_000; // 24 hours in nanoseconds (optimized from 1 hour)
    
    // Create actors
    private let wallet = actor(Principal.toText(WALLET_CANISTER_ID)) : actor {
        updateNFTCount : (Principal) -> async Nat;
        updateBalance : (Principal, Nat) -> async ();
        batchUpdate : (Principal, Nat) -> async ();
        bulk_update_nft_counts : ([Principal]) -> async [(Principal, Nat)];
    };
    
    private let ledger = actor(Principal.toText(ICP_LEDGER_CANISTER_ID)) : actor {
        transfer : (TransferArgs) -> async TransferResult;
    };
    
    // Stable storage
    private stable var registeredUsersEntries : [(Principal, Bool)] = [];
    private stable var lastPayoutTime : Int = 0;
    private stable var _lastProcessedIndex : Nat = 0;
    private stable var lastStorageUpdateTime : Int = 0;
    private stable var statsEntries : [(Principal, UserStats)] = [];
    
    // Runtime storage
    private var registeredUsers = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var userStats = HashMap.HashMap<Principal, UserStats>(0, Principal.equal, Principal.hash);
    private var nftCache = HashMap.HashMap<Principal, NFTCache>(0, Principal.equal, Principal.hash);
    private var isProcessing : Bool = false;
    private var pendingUpdates = Buffer.Buffer<(Principal, UserStats)>(100);
    private var totalPayoutsProcessed : Nat64 = 0;
    private var totalPayoutAmount : Nat64 = 0;
    private var failedTransfers : Nat64 = 0;
    private var nextScheduledPayout : Int = 0;
    private var _payoutTimerId : Nat = 0;
    
    // Load stable storage
    private func loadStableStorage() {
        for ((user, _) in registeredUsersEntries.vals()) {
            registeredUsers.put(user, true);
        };
        for ((user, stats) in statsEntries.vals()) {
            userStats.put(user, stats);
        };
        scheduleNextPayout();
    };
    
    // Schedule next payout time
    private func scheduleNextPayout() {
        let currentTime = Time.now();
        nextScheduledPayout := currentTime + PAYOUT_INTERVAL;
    };

    // Check if it's time for the next payout
    private func isPayoutDue() : Bool {
        let currentTime = Time.now();
        return currentTime >= nextScheduledPayout and not isProcessing;
    };
    
    // Save to stable storage with batching
    private func batchStorageUpdate() : async () {
        if (pendingUpdates.size() >= 100 or Time.now() - lastStorageUpdateTime >= STORAGE_UPDATE_INTERVAL) {
            for (update in pendingUpdates.vals()) {
                userStats.put(update.0, update.1);
            };
            pendingUpdates.clear();
            
            registeredUsersEntries := Iter.toArray(registeredUsers.entries());
            statsEntries := Iter.toArray(userStats.entries());
            lastStorageUpdateTime := Time.now();
        };
    };
    
    // Dynamic batch size calculation
    private func getOptimalBatchSize(userCount: Nat) : Nat {
        if (userCount < 10) return userCount;
        if (userCount < 100) return 25;
        if (userCount < 1000) return 50;
        return 75;
    };
    
    // NFT count with caching - optimized version
    private func getCachedNFTCount(user: Principal) : async Nat {
        let currentTime = Time.now();
        
        switch (nftCache.get(user)) {
            case (?cache) {
                if (currentTime - cache.timestamp < CACHE_DURATION) {
                    return cache.count;
                };
            };
            case null {};
        };
        
        // Use the regular update if it's a single user
        let count = await wallet.updateNFTCount(user);
        nftCache.put(user, { count = count; timestamp = currentTime });
        count
    };
    
    // New optimized method for batch processing NFT counts
    private func getCachedNFTCountsBatch(users: [Principal]) : async [(Principal, Nat)] {
        let currentTime = Time.now();
        
        // Filter users that need updating based on cache
        let usersToUpdate = Array.filter<Principal>(
            users,
            func (user: Principal) : Bool {
                switch (nftCache.get(user)) {
                    case (?cache) { 
                        // Update if cache is expired
                        return currentTime - cache.timestamp >= CACHE_DURATION;
                    };
                    case null { return true; };
                };
            }
        );
        
        // If there are users to update, use the bulk update method
        if (usersToUpdate.size() > 0) {
            try {
                let results = await wallet.bulk_update_nft_counts(usersToUpdate);
                
                // Update cache with new values
                for ((user, count) in results.vals()) {
                    nftCache.put(user, { count = count; timestamp = currentTime });
                };
                
                // Return all users with updated cache values
                return Array.map<Principal, (Principal, Nat)>(
                    users,
                    func (user: Principal) : (Principal, Nat) {
                        switch (nftCache.get(user)) {
                            case (?cache) { return (user, cache.count); };
                            case null { return (user, 0); };
                        };
                    }
                );
            } catch (_) {
                // Fallback to individual updates on failure
                let results = Buffer.Buffer<(Principal, Nat)>(users.size());
                for (user in users.vals()) {
                    var count = 0;
                    switch (nftCache.get(user)) {
                        case (?cache) { 
                            if (currentTime - cache.timestamp < CACHE_DURATION) {
                                // Use cached value if not expired
                                count := cache.count;
                            } else {
                                // Update individually if expired
                                try {
                                    count := await wallet.updateNFTCount(user);
                                    nftCache.put(user, { count = count; timestamp = currentTime });
                                } catch (_) {
                                    // Fallback to cache or 0 on error
                                    count := switch (nftCache.get(user)) {
                                        case (?c) { c.count };
                                        case null { 0 };
                                    };
                                };
                            }
                        };
                        case null {
                            // No cache, try to update
                            try {
                                count := await wallet.updateNFTCount(user);
                                nftCache.put(user, { count = count; timestamp = currentTime });
                            } catch (_) {
                                count := 0;
                            };
                        };
                    };
                    results.add((user, count));
                };
                return Buffer.toArray(results);
            };
        } else {
            // All users have valid cache, return cached values
            return Array.map<Principal, (Principal, Nat)>(
                users,
                func (user: Principal) : (Principal, Nat) {
                    switch (nftCache.get(user)) {
                        case (?cache) { return (user, cache.count); };
                        case null { return (user, 0); };
                    };
                }
            );
        };
    };
    
    // Calculate payout with priority
    private func shouldProcessUser(user: Principal, stats: UserStats) : Bool {
        let currentTime = Time.now();
        let timeSinceLastPayout = currentTime - stats.last_payout_time;
        return timeSinceLastPayout >= PAYOUT_INTERVAL;
    };
    
    // Calculate payout amount
    private func calculatePayout(nftCount: Nat) : Nat {
        let totalValue : Nat = nftCount * NFT_VALUE;
        let annualPayout : Nat = (totalValue * APY_PERCENT) / 100;
        let payoutPerPeriod : Nat = annualPayout / PAYOUTS_PER_YEAR;
        payoutPerPeriod
    };
    
    // Optimized batch processing function with exponential backoff
    private func processBatch(users: [Principal]) : async () {
        let startCycles = Cycles.balance();
        
        // First, get all NFT counts in a batch to minimize external calls
        let userCounts = await getCachedNFTCountsBatch(users);
        let userCountMap = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
        
        // Create a map for quick lookups
        for ((user, count) in userCounts.vals()) {
            userCountMap.put(user, count);
        };
        
        // Process users with efficient batching
        for (user in users.vals()) {
            var retryCount = 0;
            var success = false;
            
            // Get NFT count from the map
            let nftCount = Option.get(userCountMap.get(user), 0);
            
            if (nftCount > 0) {
                let payoutAmount = calculatePayout(nftCount);
                
                // Process with exponential backoff for retries
                while (not success and retryCount < MAX_RETRIES) {
                    try {
                        let transferArgs = {
                            to = user;
                            amount = { e8s = payoutAmount };
                            fee = { e8s = TRANSFER_FEE };
                            memo = 0;
                            from_subaccount = null;
                            created_at_time = null;
                        };
                        
                        let result = await ledger.transfer(transferArgs);
                        
                        switch (result) {
                            case (#Ok(_)) {
                                await wallet.batchUpdate(user, payoutAmount);
                                totalPayoutsProcessed += 1;
                                totalPayoutAmount += Nat64.fromNat(payoutAmount);
                                
                                let currentPayouts = switch (userStats.get(user)) {
                                    case (?stats) { stats.total_payouts_received };
                                    case null { 0 : Nat64 };
                                };
                                
                                let newStats : UserStats = {
                                    nft_count = Nat64.fromNat(nftCount);
                                    last_payout_amount = Nat64.fromNat(payoutAmount);
                                    last_payout_time = Time.now();
                                    total_payouts_received = currentPayouts + 1;
                                };
                                
                                pendingUpdates.add((user, newStats));
                                success := true;
                            };
                            case (#Err(_)) {
                                failedTransfers += 1;
                                retryCount += 1;
                                
                                // Exponential backoff delay
                                let baseDelay = 1_000_000_000; // 1 second in nanoseconds
                                let delayNanos = baseDelay * (2 ** (retryCount - 1));
                                let maxDelay = 10_000_000_000; // 10 seconds in nanoseconds
                                let actualDelay = Int.min(delayNanos, maxDelay);
                                
                                let startDelay = Time.now();
                                while (Time.now() - startDelay < actualDelay) {
                                    await async { };  // Minimal delay with yield
                                };
                            };
                        };
                    } catch (_) {
                        retryCount += 1;
                        
                        // Same exponential backoff as above
                        if (retryCount < MAX_RETRIES) {
                            let baseDelay = 1_000_000_000; // 1 second in nanoseconds
                            let delayNanos = baseDelay * (2 ** (retryCount - 1));
                            let maxDelay = 10_000_000_000; // 10 seconds in nanoseconds
                            let actualDelay = Int.min(delayNanos, maxDelay);
                            
                            let startDelay = Time.now();
                            while (Time.now() - startDelay < actualDelay) {
                                await async { };  // Minimal delay with yield
                            };
                        };
                    };
                };
            };
        };
        
        // Monitor cycle consumption
        let cyclesUsed = startCycles - Cycles.balance();
        if (cyclesUsed > 1_000_000_000_000) { // If using more than 1T cycles
            Debug.print("High cycle usage detected in batch processing: " # debug_show(cyclesUsed));
        };
        
        await batchStorageUpdate();
    };
    
    // Process payouts with optimizations
    public shared func processPayouts() : async () {
        if (not isPayoutDue()) {
            return;
        };
        
        isProcessing := true;
        
        try {
            let users = Iter.toArray(registeredUsers.keys());
            let totalUsers = users.size();
            let batchSize = getOptimalBatchSize(totalUsers);
            
            var startIndex = 0;
            while (startIndex < totalUsers) {
                let remainingUsers = totalUsers - startIndex;
                let currentBatchSize = if (remainingUsers < batchSize) remainingUsers else batchSize;
                let batch = Array.subArray(users, startIndex, currentBatchSize);
                
                // Process only users who need payouts
                let eligibleUsers = Array.filter(
                    batch,
                    func (user: Principal) : Bool {
                        switch (userStats.get(user)) {
                            case (?stats) { shouldProcessUser(user, stats) };
                            case null { true };
                        }
                    }
                );
                
                if (eligibleUsers.size() > 0) {
                    await processBatch(eligibleUsers);
                };
                
                startIndex += currentBatchSize;
            };
            
            lastPayoutTime := Time.now();
            scheduleNextPayout();
        } catch (e) {
            Debug.print("Error in processPayouts: " # Error.message(e));
        };
        
        isProcessing := false;
    };
    
    // Register user
    public shared(msg) func register() : async () {
        registeredUsers.put(msg.caller, true);
        pendingUpdates.add((msg.caller, {
            nft_count = 0;
            last_payout_amount = 0;
            last_payout_time = 0;
            total_payouts_received = 0;
        }));
        await batchStorageUpdate();
    };
    
    // Helper function to increment Nat64
    private func incrementNat64(n: Nat64) : Nat64 {
        let result = n + 1;
        if (result < n) { n } else { result }
    };
    
    // Get stats
    public query func get_stats() : async Stats {
        {
            total_registered_users = Nat64.fromNat(registeredUsers.size());
            last_payout_time = lastPayoutTime;
            next_payout_time = nextScheduledPayout;
            total_payouts_processed = totalPayoutsProcessed;
            total_payout_amount = totalPayoutAmount;
            failed_transfers = failedTransfers;
            is_processing = isProcessing;
        }
    };
    
    // Get user stats
    public query func get_user_stats(user: Principal) : async UserStats {
        switch (userStats.get(user)) {
            case (?stats) { stats };
            case null {
                {
                    nft_count = 0;
                    last_payout_amount = 0;
                    last_payout_time = 0;
                    total_payouts_received = 0;
                }
            }
        }
    };
    
    // Get all user stats
    public query func get_all_user_stats() : async [(Principal, UserStats)] {
        Iter.toArray(userStats.entries())
    };
    
    // Types for ICP ledger
    private type TransferArgs = {
        to: Principal;
        amount: { e8s: Nat };
        fee: { e8s: Nat };
        memo: Nat;
        from_subaccount: ?[Nat8];
        created_at_time: ?{ timestamp_nanos: Nat64 };
    };
    
    private type TransferResult = {
        #Ok: Nat;
        #Err: TransferError;
    };
    
    private type TransferError = {
        #BadFee: { expected_fee: { e8s: Nat64 } };
        #BadBurn: { min_burn_amount: { e8s: Nat64 } };
        #InsufficientFunds: { balance: { e8s: Nat64 } };
        #TooOld;
        #CreatedInFuture: { ledger_time: Nat64 };
        #TemporarilyUnavailable;
        #GenericError: { error_code: Nat64; message: Text };
    };
    
    // Initialize
    loadStableStorage();
} 