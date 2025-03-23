import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Time "mo:base/Time";

actor Wallet {
    // External canister IDs
    private let NFT_CANISTER_1 = "erfen-7aaaa-aaaap-ahniq-cai"; // Daku Motoko
    private let NFT_CANISTER_2 = "v6gck-vqaaa-aaaal-qi3sa-cai"; // GG Album Release
    
    // Stable storage
    private stable var nftCountsEntries : [(Principal, Nat)] = [];
    private stable var balancesEntries : [(Principal, Nat)] = [];
    private stable var lastUpdateTime : Int = 0;
    private stable let UPDATE_INTERVAL : Int = 300_000_000_000; // 5 minutes in nanoseconds
    
    // Runtime storage
    private var nftCounts = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var balances = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    
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
    
    // Update NFT count for a user (with caching)
    public shared func updateNFTCount(user: Principal) : async Nat {
        // Check if we need to update (5-minute cache)
        let currentTime = Time.now();
        if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
            return switch (nftCounts.get(user)) {
                case (?count) { count };
                case null { 0 };
            };
        };
        
        // Query both NFT canisters
        let nft1 = await queryNFTCount(user, NFT_CANISTER_1);
        let nft2 = await queryNFTCount(user, NFT_CANISTER_2);
        
        let totalCount = nft1 + nft2;
        nftCounts.put(user, totalCount);
        saveToStableStorage();
        
        totalCount;
    };
    
    // Query NFT count from a specific canister
    private func queryNFTCount(user: Principal, canisterId: Text) : async Nat {
        let canister = actor(canisterId) : actor {
            getOwnedNFTs : (Principal) -> async [Nat];
        };
        
        let nfts = await canister.getOwnedNFTs(user);
        nfts.size();
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
        assert(msg.caller == Principal.fromText("zeqfj-qyaaa-aaaaf-qanua-cai")); // Payout canister ID
        
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
} 