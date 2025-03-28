import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Time "mo:base/Time";

actor class Wallet() {
    // Types
    public type Holder = {
        gg_count: Nat64;
        daku_count: Nat64;
        last_updated: Nat64;
        total_count: Nat64;
    };

    // State
    private var holders : [(Principal, Holder)] = [];

    // Public functions
    public func get_all_holders() : async [(Principal, Holder)] {
        holders
    };

    public func add_holder(principal: Principal, holder: Holder) : async () {
        let new_holder : [(Principal, Holder)] = [(principal, holder)];
        holders := Array.append(holders, new_holder);
    };

    public func remove_holder(principal: Principal) : async () {
        holders := Array.filter<(Principal, Holder)>(holders, func((p : Principal, _ : Holder)) : Bool { p != principal });
    };

    public func update_holder(principal: Principal, holder: Holder) : async () {
        holders := Array.map<(Principal, Holder), (Principal, Holder)>(holders, func((p : Principal, h : Holder)) : (Principal, Holder) {
            if (p == principal) { (p, holder) } else { (p, h) }
        });
    };

    // Test helper functions
    public func clear_holders() : async () {
        holders := [];
    };

    public func get_holder_count() : async Nat {
        holders.size()
    };
}; 