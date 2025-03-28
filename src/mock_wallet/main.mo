import Principal "mo:base/Principal";
import Int64 "mo:base/Int64";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";

actor MockWallet {
    private let holders = HashMap.HashMap<Principal, { nft_count: Nat64; last_updated: Int64 }>(0, Principal.equal, Principal.hash);

    public shared func get_all_holders() : async [(Principal, { nft_count: Nat64; last_updated: Int64 })] {
        let testHolder = Principal.fromText("2vxsx-fae");
        let testHolderInfo = { nft_count = Nat64.fromNat(1); last_updated = Int64.fromInt(0) };
        holders.put(testHolder, testHolderInfo);
        
        let entries = holders.entries();
        let result = Iter.toArray<(Principal, { nft_count: Nat64; last_updated: Int64 })>(entries);
        Debug.print("Returning " # Nat.toText(result.size()) # " holders");
        result
    };

    public shared func get_nft_count(owner: Principal) : async Nat {
        switch (holders.get(owner)) {
            case (?info) { Nat64.toNat(info.nft_count) };
            case (null) { 0 };
        };
    };

    public shared func updateBalance(owner: Principal, amount: Nat) : async () {
        Debug.print("Updating balance for " # Principal.toText(owner) # " with amount " # Nat.toText(amount));
    };
} 