import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";

actor TestToken {
    private let tokenName = "Test Token";
    private let tokenSymbol = "TEST";
    private let tokenDecimals : Nat64 = 8;
    private let tokenFee : Nat64 = 10_000_000;
    private let min_burn_amount : Nat64 = 1_000_000;
    
    private var tokenTotalSupply : Nat64 = 1_000_000_000_000_000;
    private let accounts = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, Principal.hash);
    
    // Initialize with minting account
    accounts.put(Principal.fromActor(TestToken), tokenTotalSupply);

    public query func name() : async Text {
        tokenName;
    };

    public query func symbol() : async Text {
        tokenSymbol;
    };

    public query func decimals() : async Nat64 {
        tokenDecimals;
    };

    public query func fee() : async Nat64 {
        tokenFee;
    };

    public query func total_supply() : async Nat64 {
        tokenTotalSupply;
    };

    public query func balance_of(owner: Principal) : async Nat64 {
        switch (accounts.get(owner)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
    };

    public type Account = {
        owner: Principal;
        subaccount: ?[Nat8];
    };

    public type TransferArg = {
        from_subaccount: ?[Nat8];
        to: Account;
        amount: Nat;
        fee: ?Nat;
        memo: ?[Nat8];
        created_at_time: ?Nat64;
    };

    public type TransferError = {
        #BadFee: { expected_fee: Nat };
        #BadBurn: { min_burn_amount: Nat };
        #InsufficientFunds: { balance: Nat };
        #TooOld;
        #CreatedInFuture: { ledger_time: Nat64 };
        #Duplicate: { duplicate_of: Nat };
        #TemporarilyUnavailable;
        #GenericError: { error_code: Nat; message: Text };
    };

    public type TransferResult = {
        #Ok: Nat;
        #Err: TransferError;
    };

    public shared(msg) func transfer(to: Principal, amount: Nat64) : async Bool {
        let caller = msg.caller;
        let fromBalance = switch (accounts.get(caller)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        if (fromBalance < amount + tokenFee) {
            return false;
        };
        
        let toBalance = switch (accounts.get(to)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        accounts.put(caller, fromBalance - amount - tokenFee);
        accounts.put(to, toBalance + amount);
        
        true;
    };

    public shared(msg) func icrc1_transfer(arg: TransferArg) : async TransferResult {
        let caller = msg.caller;
        let fromBalance = switch (accounts.get(caller)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        let amount = Nat64.fromNat(arg.amount);
        if (fromBalance < amount + tokenFee) {
            return #Err(#InsufficientFunds { balance = Nat64.toNat(fromBalance) });
        };
        
        let toBalance = switch (accounts.get(arg.to.owner)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        accounts.put(caller, fromBalance - amount - tokenFee);
        accounts.put(arg.to.owner, toBalance + amount);
        
        #Ok(0)
    };

    public query func icrc1_balance_of(account: Account) : async Nat {
        switch (accounts.get(account.owner)) {
            case (?balance) { Nat64.toNat(balance) };
            case (null) { 0 };
        };
    };

    public shared(msg) func mint(to: Principal, amount: Nat64) : async Bool {
        let toBalance = switch (accounts.get(to)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        accounts.put(to, toBalance + amount);
        tokenTotalSupply += amount;
        
        true;
    };
} 