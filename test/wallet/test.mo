import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";

actor class Test() {
    // Get references to deployed canisters
    let wallet = actor("br5f7-7uaaa-aaaaa-qaaca-cai") : actor {
        // Define the interface functions we'll test
        get_all_holders : () -> async [(Principal, { 
            gg_count: Nat64; 
            daku_count: Nat64; 
            last_updated: Nat64; 
            total_count: Nat64 
        })];
        
        get_holder_count : () -> async Nat;
    };

    // Test getting all holders
    public func test_get_all_holders() : async () {
        Debug.print("Running get_all_holders test...");
        let holders = await wallet.get_all_holders();
        Debug.print("Number of holders: " # debug_show(holders.size()));
        
        if (holders.size() > 0) {
            Debug.print("First holder: " # debug_show(holders[0]));
        };
    };

    // Test getting holder count
    public func test_get_holder_count() : async () {
        Debug.print("Running get_holder_count test...");
        let count = await wallet.get_holder_count();
        Debug.print("Holder count: " # debug_show(count));
    };
} 