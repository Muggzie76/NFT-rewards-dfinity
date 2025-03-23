import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Nat32 "mo:base/Nat32";

actor Wallet {
    // Types
    type TokenIndex = Nat;
    type AccountIdentifier = Text;
    type Result_1 = {
        #ok : [TokenIndex];
        #err : {
            #InvalidToken : Text;
            #Other : Text;
        };
    };
    
    // External canister IDs
    private let NFT_CANISTER_1 = "erfen-7aaaa-aaaap-ahniq-cai"; // Daku Motoko
    private let NFT_CANISTER_2 = "v6gck-vqaaa-aaaal-qi3sa-cai"; // GG Album Release
    private let PAYOUT_CANISTER_ID = "zeqfj-qyaaa-aaaaf-qanua-cai";
    
    // Stable storage
    private stable var nftCountsEntries : [(Principal, Nat)] = [];
    private stable var balancesEntries : [(Principal, Nat)] = [];
    private stable var lastUpdateTime : Int = 0;
    private stable let UPDATE_INTERVAL : Int = 300_000_000_000; // 5 minutes in nanoseconds
    
    // Runtime storage
    private var nftCounts = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var balances = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    
    // Helper function to convert Principal to AccountIdentifier
    private func principalToAccountIdentifier(principal: Principal) : AccountIdentifier {
        Principal.toText(principal)
    };
    
    // Load stable storage on init
    private func loadStableStorage() {
        for ((principal, count) in nftCountsEntries.vals()) {
            nftCounts.put(principal, count);
        };
        for ((principal, balance) in balancesEntries.vals()) {
            balances.put(principal, balance);
        };
    };
    
    // Save to stable storage (only if significant changes)
    private func saveToStableStorage() {
        let currentTime = Time.now();
        if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
            nftCountsEntries := Iter.toArray(nftCounts.entries());
            balancesEntries := Iter.toArray(balances.entries());
            lastUpdateTime := currentTime;
        };
    };
    
    // Initialize
    loadStableStorage();
    
    // Query NFT count from a specific canister
    private func queryNFTCount(user: Principal, canisterId: Text) : async Nat {
        try {
            if (canisterId == NFT_CANISTER_1) {
                // Daku Motoko specific interface
                let canister = actor(canisterId) : actor {
                    getRegistry : () -> async [(Principal, [Nat])];
                };
                
                let registry = await canister.getRegistry();
                for ((owner, tokens) in registry.vals()) {
                    if (owner == user) {
                        return tokens.size();
                    };
                };
                return 0;
            } else {
                // GG Album Release interface
                let canister = actor(canisterId) : actor {
                    tokens : (AccountIdentifier) -> async Result_1;
                };
                
                let accountId = principalToAccountIdentifier(user);
                let result = await canister.tokens(accountId);
                
                switch (result) {
                    case (#ok(tokens)) {
                        return tokens.size();
                    };
                    case (#err(e)) {
                        Debug.print("Error getting tokens: " # debug_show(e));
                        return 0;
                    };
                };
            };
        } catch (error) {
            Debug.print("Error querying NFT count: " # Error.message(error));
            return 0;
        };
    };
    
    // Update NFT count for a user (with caching)
    public shared func updateNFTCount(user: Principal) : async Nat {
        // Query both NFT canisters
        let nft1 = await queryNFTCount(user, NFT_CANISTER_1);
        let nft2 = await queryNFTCount(user, NFT_CANISTER_2);
        
        let totalCount = nft1 + nft2;
        nftCounts.put(user, totalCount);
        saveToStableStorage();
        
        totalCount;
    };
    
    // Get NFT count for a user
    public query func getNFTCount(user: Principal) : async Nat {
        switch (nftCounts.get(user)) {
            case (?count) { count };
            case null { 0 };
        };
    };
    
    // Update balance (restricted to payout canister)
    public shared(msg) func updateBalance(user: Principal, amount: Nat) : async () {
        let caller = msg.caller;
        let expectedCaller = Principal.fromText(PAYOUT_CANISTER_ID);
        
        if (not Principal.equal(caller, expectedCaller)) {
            Debug.print("Unauthorized caller: " # Principal.toText(caller));
            Debug.print("Expected caller: " # PAYOUT_CANISTER_ID);
            assert(false);
        };
        
        let currentBalance = switch (balances.get(user)) {
            case (?balance) { balance };
            case null { 0 };
        };
        
        balances.put(user, currentBalance + amount);
        saveToStableStorage();
    };
    
    // Get balance for a user
    public query func getBalance(user: Principal) : async Nat {
        switch (balances.get(user)) {
            case (?balance) { balance };
            case null { 0 };
        };
    };
}; 