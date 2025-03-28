import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Option "mo:base/Option";
import Blob "mo:base/Blob";

actor ICRC1Token {
    private let tokenName = "ICRC-1 Token";
    private let tokenSymbol = "ICRC1";
    private let tokenDecimals : Nat64 = 8;
    private let tokenFee : Nat64 = 10_000_000;
    private let min_burn_amount : Nat64 = 1_000_000;
    
    private var tokenTotalSupply : Nat64 = 1_000_000_000_000_000;
    private let accounts = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, Principal.hash);
    
    // Initialize with minting account
    accounts.put(Principal.fromActor(ICRC1Token), tokenTotalSupply);

    public type Account = {
        owner : Principal;
        subaccount : ?Blob;
    };

    public type TransferArg = {
        from_subaccount : ?Blob;
        to : Account;
        amount : Nat64;
        fee : ?Nat64;
        memo : ?Nat64;
        created_at_time : ?Nat64;
    };

    public type TransferError = {
        #BadFee : { expected_fee : Nat64 };
        #BadBurn : { min_burn_amount : Nat64 };
        #InsufficientFunds : { balance : Nat64 };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat64 };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat64; message : Text };
    };

    public type TransferResult = {
        #Ok : Nat64;
        #Err : TransferError;
    };

    public type MetadataValue = {
        #Nat : Nat;
        #Nat64 : Nat64;
        #Text : Text;
        #Blob : Blob;
    };

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

    public query func balance_of(account : Account) : async Nat64 {
        let owner = account.owner;
        switch (accounts.get(owner)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
    };

    public shared func transfer(arg : TransferArg) : async TransferResult {
        let from = Principal.fromActor(ICRC1Token);
        let fromBalance = switch (accounts.get(from)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        let fee = Option.get(arg.fee, tokenFee);
        
        if (fromBalance < arg.amount + fee) {
            return #Err(#InsufficientFunds { balance = fromBalance });
        };
        
        if (fee != tokenFee) {
            return #Err(#BadFee { expected_fee = tokenFee });
        };
        
        let toBalance = switch (accounts.get(arg.to.owner)) {
            case (?balance) { balance };
            case (null) { Nat64.fromNat(0) };
        };
        
        accounts.put(from, fromBalance - arg.amount - fee);
        accounts.put(arg.to.owner, toBalance + arg.amount);
        
        #Ok(arg.amount);
    };

    public query func icrc1_metadata() : async [(Text, MetadataValue)] {
        [
            ("icrc1:fee", #Nat64(tokenFee)),
            ("icrc1:name", #Text(tokenName)),
            ("icrc1:symbol", #Text(tokenSymbol)),
            ("icrc1:decimals", #Nat64(tokenDecimals)),
            ("icrc1:min_burn_amount", #Nat64(min_burn_amount))
        ];
    };

    public query func icrc1_minting_account() : async ?Account {
        null;
    };

    public query func icrc1_supported_standards() : async [(Text, Text)] {
        [("ICRC-1", "https://github.com/dfinity/ICRC-1")];
    };
} 
