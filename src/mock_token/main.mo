import Principal "mo:base/Principal";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Bool "mo:base/Bool";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Debug "mo:base/Debug";

actor MockToken {
    // Types
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

    // State
    private var balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);
    private var nextId : Nat = 0;

    // Initialization
    balances.put(Principal.fromText("bd3sg-teaaa-aaaaa-qaaba-cai"), 10_000_000_000); // Payout canister gets 100 tokens

    // ICRC-1 Interface
    public shared query func icrc1_balance_of(account: Account) : async Nat {
        let owner = account.owner;
        switch (balances.get(owner)) {
            case null { 0 };
            case (?balance) { balance };
        };
    };

    public shared query func icrc1_fee() : async Nat {
        10_000 // Default fee 0.0001 tokens
    };

    public shared(msg) func icrc1_transfer(args: TransferArg) : async TransferResult {
        let from = switch(args.from_subaccount) {
            case null { msg.caller };
            case _ { msg.caller }; // Ignoring subaccounts for mock
        };
        
        let fromBalance = switch (balances.get(from)) {
            case null { 0 };
            case (?balance) { balance };
        };
        
        let fee = switch (args.fee) {
            case null { 10_000 }; // Default fee 0.0001 tokens
            case (?f) { f };
        };
        
        if (fromBalance < args.amount + fee) {
            return #Err(#InsufficientFunds({ balance = fromBalance }));
        };
        
        // Update balances
        let newFromBalance = fromBalance - args.amount - fee;
        balances.put(from, newFromBalance);
        
        let to = args.to.owner;
        let toBalance = switch (balances.get(to)) {
            case null { 0 };
            case (?balance) { balance };
        };
        
        let newToBalance = toBalance + args.amount;
        balances.put(to, newToBalance);
        
        nextId += 1;
        
        return #Ok(nextId);
    };

    // Testing functions
    public shared(msg) func mint(to: Principal, amount: Nat) : async () {
        let toBalance = switch (balances.get(to)) {
            case null { 0 };
            case (?balance) { balance };
        };
        
        let newToBalance = toBalance + amount;
        balances.put(to, newToBalance);
    };

    public shared query func get_all_balances() : async [(Principal, Nat)] {
        var result : [(Principal, Nat)] = [];
        for ((owner, balance) in balances.entries()) {
            result := Array.append(result, [(owner, balance)]);
        };
        result;
    };
} 