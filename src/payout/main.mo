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

    // External canister IDs
    private let WALLET_CANISTER_ID = Principal.fromText("rce3q-iaaaa-aaaap-qpyfa-cai");
    private let ICP_LEDGER_CANISTER_ID = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

    // Constants
    private let TRANSFER_FEE : Nat = 10_000; // 0.0001 ICP in e8s
    private let BATCH_SIZE : Nat = 50; // Process users in batches
    private let MIN_PROCESS_INTERVAL = 60_000_000_000; // 60 seconds in nanoseconds
    private let STORAGE_UPDATE_INTERVAL : Int = 3600_000_000_000; // 1 hour
    private let PAYOUT_INTERVAL : Int = 432_000_000_000_000; // 5 days in nanoseconds
    private let NFT_VALUE : Nat = 1_000;
    private let APY_PERCENT : Nat = 10;
    private let PAYOUTS_PER_YEAR : Nat = 73;
    private let MAX_BATCH_SIZE = 100;
    private let MAX_RETRIES = 3;
    private let RETRY_DELAY = 1_000_000_000; // 1 second in nanoseconds
    
    // Create actors once at the top level
    private let wallet = actor(Principal.toText(WALLET_CANISTER_ID)) : actor {
        updateNFTCount : (Principal) -> async Nat;
        updateBalance : (Principal, Nat) -> async ();
        batchUpdate : (Principal, Nat) -> async ();
    };
    
    private let ledger = actor(Principal.toText(ICP_LEDGER_CANISTER_ID)) : actor {
        transfer : (TransferArgs) -> async TransferResult;
    };
    
    // Stable storage
    private stable var registeredUsersEntries : [(Principal, Bool)] = [];
    private stable var lastPayoutTime : Int = 0;
    private stable var lastProcessedIndex : Nat = 0;
    private stable var lastStorageUpdateTime : Int = 0;
    private stable var statsEntries : [(Principal, UserStats)] = [];
    
    // Runtime storage
    private var registeredUsers = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var userStats = HashMap.HashMap<Principal, UserStats>(0, Principal.equal, Principal.hash);
    private var isProcessing : Bool = false;
    private var pendingStorageUpdates : Bool = false;
    private var totalPayoutsProcessed : Nat64 = 0;
    private var totalPayoutAmount : Nat64 = 0;
    private var failedTransfers : Nat64 = 0;
    
    // Load stable storage on init
    private func loadStableStorage() {
        for ((user, _) in registeredUsersEntries.vals()) {
            registeredUsers.put(user, true);
        };
        for ((user, stats) in statsEntries.vals()) {
            userStats.put(user, stats);
        };
    };
    
    // Save to stable storage if needed
    private func saveToStableStorageIfNeeded() {
        let currentTime = Time.now();
        if (pendingStorageUpdates or (currentTime - lastStorageUpdateTime >= STORAGE_UPDATE_INTERVAL)) {
            registeredUsersEntries := Iter.toArray(registeredUsers.entries());
            statsEntries := Iter.toArray(userStats.entries());
            lastStorageUpdateTime := currentTime;
            pendingStorageUpdates := false;
        };
    };
    
    // Initialize
    loadStableStorage();
    
    // Register a user
    public shared(msg) func register() : async () {
        registeredUsers.put(msg.caller, true);
        pendingStorageUpdates := true;
        saveToStableStorageIfNeeded();
    };
    
    // Calculate payout for a given NFT count
    private func calculatePayout(nftCount: Nat) : Nat {
        let totalValue : Nat = nftCount * NFT_VALUE;
        let annualPayout : Nat = (totalValue * APY_PERCENT) / 100;
        let payoutPerPeriod : Nat = annualPayout / PAYOUTS_PER_YEAR;
        payoutPerPeriod;
    };
    
    // Helper function to increment Nat64
    private func incrementNat64(n: Nat64) : Nat64 {
        let one : Nat64 = 1;
        let result = Nat64.add(n, one);
        if (result < n) { // Handle overflow
            n // Return original value if overflow would occur
        } else {
            result
        }
    };
    
    // Process payouts in batches
    private func processBatch(users: [Principal]) : async () {
        for (user in users.vals()) {
            // Update NFT count
            let nftCount = await wallet.updateNFTCount(user);
            
            if (nftCount > 0) {
                // Calculate payout
                let payoutAmount = calculatePayout(nftCount);
                
                // Transfer ICP
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
                        // Update user's balance in wallet canister
                        await wallet.batchUpdate(user, payoutAmount);
                        
                        // Update stats
                        totalPayoutsProcessed += 1;
                        totalPayoutAmount += Nat64.fromNat(payoutAmount);
                        
                        // Update user stats
                        let currentStats = switch (userStats.get(user)) {
                            case (?stats) { stats };
                            case null {
                                {
                                    nft_count = 0:Nat64;
                                    last_payout_amount = 0:Nat64;
                                    last_payout_time = 0;
                                    total_payouts_received = 0:Nat64;
                                };
                            };
                        };
                        
                        let newStats : UserStats = {
                            nft_count = Nat64.fromNat(nftCount);
                            last_payout_amount = Nat64.fromNat(payoutAmount);
                            last_payout_time = Time.now();
                            total_payouts_received = incrementNat64(currentStats.total_payouts_received);
                        };
                        
                        userStats.put(user, newStats);
                    };
                    case (#Err(_)) {
                        failedTransfers += 1;
                    };
                };
            };
        };
    };
    
    // Process payouts to all registered users
    public shared func processPayouts() : async () {
        let currentTime = Time.now();
        if (currentTime - lastPayoutTime < MIN_PROCESS_INTERVAL) {
            return; // Prevent too frequent processing
        };
        
        if (isProcessing) {
            return; // Prevent multiple simultaneous payouts
        };
        
        isProcessing := true;
        
        let users = Iter.toArray(registeredUsers.keys());
        let totalUsers = users.size();
        
        // Process in batches
        var startIndex = 0;
        while (startIndex < totalUsers) {
            let remainingUsers = totalUsers - startIndex;
            let batchSize = if (remainingUsers < BATCH_SIZE) remainingUsers else BATCH_SIZE;
            let endIndex = startIndex + batchSize;
            
            let batch = Array.subArray(users, startIndex, batchSize);
            await processBatch(batch);
            
            startIndex := endIndex;
        };
        
        lastPayoutTime := currentTime;
        lastProcessedIndex := 0;
        pendingStorageUpdates := true;
        saveToStableStorageIfNeeded();
        
        isProcessing := false;
    };
    
    // Heartbeat function to check for payout timing
    system func heartbeat() : async () {
        let currentTime = Time.now();
        if (currentTime - lastPayoutTime >= PAYOUT_INTERVAL) {
            if (not isProcessing) {
                await processPayouts();
            };
        };
    };
    
    // Get global stats
    public query func get_stats() : async Stats {
        {
            total_registered_users = Nat64.fromNat(registeredUsers.size());
            last_payout_time = lastPayoutTime;
            next_payout_time = lastPayoutTime + PAYOUT_INTERVAL;
            total_payouts_processed = totalPayoutsProcessed;
            total_payout_amount = totalPayoutAmount;
            failed_transfers = failedTransfers;
            is_processing = isProcessing;
        }
    };
    
    // Get stats for a specific user
    public query func get_user_stats(user: Principal) : async UserStats {
        switch (userStats.get(user)) {
            case (?stats) { stats };
            case null {
                {
                    nft_count = 0;
                    last_payout_amount = 0;
                    last_payout_time = 0;
                    total_payouts_received = 0;
                };
            };
        }
    };
    
    // Get stats for all users
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
} 