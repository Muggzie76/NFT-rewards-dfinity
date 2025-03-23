import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";

actor Payout {
    // Constants
    private let PAYOUT_INTERVAL : Int = 432_000_000_000_000; // 5 days in nanoseconds
    private let NFT_VALUE : Nat = 1_000;
    private let APY_PERCENT : Nat = 10;
    private let PAYOUTS_PER_YEAR : Nat = 73;
    private let TRANSFER_FEE : Nat = 10_000; // 0.0001 ICP in e8s
    private let BATCH_SIZE : Nat = 50; // Process users in batches
    
    // External canister IDs
    private let WALLET_CANISTER = "rce3q-iaaaa-aaaap-qpyfa-cai"; // Wallet canister ID
    private let ICP_LEDGER = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    
    // Stable storage
    private stable var registeredUsersEntries : [(Principal, Bool)] = [];
    private stable var lastPayoutTime : Int = 0;
    private stable var lastProcessedIndex : Nat = 0;
    
    // Runtime storage
    private var registeredUsers = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    
    // Load stable storage on init
    private func loadStableStorage() {
        for ((user, _) in registeredUsersEntries.vals()) {
            registeredUsers.put(user, true);
        };
    };
    
    // Save to stable storage
    private func saveToStableStorage() {
        registeredUsersEntries := Iter.toArray(registeredUsers.entries());
    };
    
    // Initialize
    loadStableStorage();
    
    // Register a user
    public shared(msg) func register() : async () {
        registeredUsers.put(msg.caller, true);
        saveToStableStorage();
    };
    
    // Calculate payout for a given NFT count
    private func calculatePayout(nftCount: Nat) : Nat {
        let totalValue : Nat = nftCount * NFT_VALUE;
        let annualPayout : Nat = (totalValue * APY_PERCENT) / 100;
        let payoutPerPeriod : Nat = annualPayout / PAYOUTS_PER_YEAR;
        payoutPerPeriod;
    };
    
    // Process payouts in batches
    private func processBatch(users: [Principal]) : async () {
        let wallet = actor(WALLET_CANISTER) : actor {
            updateNFTCount : (Principal) -> async Nat;
            updateBalance : (Principal, Nat) -> async ();
        };
        
        let ledger = actor(ICP_LEDGER) : actor {
            transfer : (TransferArgs) -> async TransferResult;
        };
        
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
                
                let _result = await ledger.transfer(transferArgs);
                
                // Update user's balance in wallet canister
                await wallet.updateBalance(user, payoutAmount);
            };
        };
    };
    
    // Process payouts to all registered users
    public shared func processPayouts() : async () {
        let entries = Iter.toArray(registeredUsers.entries());
        let usersBuffer = Buffer.Buffer<Principal>(entries.size());
        
        for ((user, _) in entries.vals()) {
            usersBuffer.add(user);
        };
        
        let users = Buffer.toArray(usersBuffer);
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
        
        lastPayoutTime := Time.now();
        lastProcessedIndex := 0;
    };
    
    // Heartbeat function to check for payout timing
    system func heartbeat() : async () {
        let currentTime = Time.now();
        if (currentTime - lastPayoutTime >= PAYOUT_INTERVAL) {
            await processPayouts();
        };
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
        Ok: Nat;
    };
} 