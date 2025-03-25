import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Bool "mo:base/Bool";
import Int64 "mo:base/Int64";
import Array "mo:base/Array";

actor Payout {
    // Types
    private type Stats = {
        last_payout_time: Int;
        next_payout_time: Int;
        total_payouts_processed: Nat64;
        total_payout_amount: Nat64;
        failed_transfers: Nat64;
        is_processing: Bool;
    };

    // External canister IDs
    private let WALLET_CANISTER_ID = Principal.fromText("rce3q-iaaaa-aaaap-qpyfa-cai"); // Mainnet wallet canister
    private let ICZOMBIES_CANISTER_ID = Principal.fromText("rwdg7-ciaaa-aaaam-qczja-cai"); // Mainnet Zombie token canister

    // Constants
    private let PAYOUT_INTERVAL : Int = 432_000_000_000_000; // 5 days in nanoseconds
    private let NFT_VALUE : Nat64 = 2_000_000_000; // 2000 tokens per NFT (with 8 decimals)
    private var APY_PERCENT : Nat64 = 10; // 10% APY
    private let PAYOUTS_PER_YEAR : Nat64 = 73; // Every 5 days (73 payouts per year)
    private let MIN_PAYOUT_AMOUNT : Nat64 = 1_000_000; // 0.01 tokens minimum
    private let MAX_RETRIES : Nat = 3;
    private let MIN_BALANCE_THRESHOLD : Nat64 = 100_000_000; // 1 token minimum balance
    
    // Admin state
    private stable var isPaused : Bool = false;
    private stable var admin : Principal = Principal.fromText("aaaaa-aa"); // Default to management canister
    
    // Error log storage
    private stable var errorLogs : [Text] = [];
    private let MAX_ERROR_LOGS : Nat = 50;
    
    // Enhanced logging for mainnet
    private func logMainnetEvent(event: Text) : () {
        Debug.print("[Mainnet] " # event);
        // For error reports, add to our retrievable logs
        if (Text.startsWith(event, #text "Transfer failed")) {
            if (errorLogs.size() >= MAX_ERROR_LOGS) {
                errorLogs := Array.tabulate<Text>(MAX_ERROR_LOGS - 1, func(i) { errorLogs[i+1] });
            };
            errorLogs := Array.append<Text>(errorLogs, [event]);
        };
    };
    
    // Admin functions
    public shared(msg) func setAdmin(newAdmin: Principal) : async () {
        assert(msg.caller == admin);
        admin := newAdmin;
    };
    
    public shared(msg) func pause() : async () {
        assert(msg.caller == admin);
        isPaused := true;
        Debug.print("Payouts paused by admin");
    };
    
    public shared(msg) func resume() : async () {
        assert(msg.caller == admin);
        isPaused := false;
        Debug.print("Payouts resumed by admin");
    };
    
    public shared(msg) func updateAPY(newAPY: Nat64) : async () {
        assert(msg.caller == admin);
        APY_PERCENT := newAPY;
        Debug.print("APY updated to: " # Nat64.toText(newAPY) # "%");
    };
    
    // Emergency stop
    public shared(msg) func emergencyStop() : async () {
        assert(msg.caller == admin);
        isPaused := true;
        isProcessing := false;
        Debug.print("Emergency stop activated by admin");
    };
    
    // Check if caller is admin
    private func isAdmin(caller: Principal) : Bool {
        caller == admin
    };
    
    // Create actors
    private let wallet = actor(Principal.toText(WALLET_CANISTER_ID)) : actor {
        get_all_holders : () -> async [(Principal, { gg_count: Nat64; daku_count: Nat64; last_updated: Nat64; total_count: Nat64 })];
        updateBalance : (Principal, Nat) -> async ();
        get_nft_count : (Principal) -> async Nat;
    };
    
    // Types for ICRC-1 token
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

    private type Value = {
        #Nat: Nat;
        #Int: Int;
        #Text: Text;
        #Blob: [Nat8];
        #Array: [Value];
        #Record: [(Text, Value)];
    };

    private let iczombies = actor(Principal.toText(ICZOMBIES_CANISTER_ID)) : actor {
        icrc1_transfer : shared (TransferArg) -> async TransferResult;
        icrc1_balance_of : shared query (Account) -> async Nat;
        icrc1_name : shared query () -> async Text;
        icrc1_symbol : shared query () -> async Text;
        icrc1_decimals : shared query () -> async Nat8;
        icrc1_metadata : shared query () -> async [(Text, Value)];
        icrc1_total_supply : shared query () -> async Nat;
        icrc1_fee : shared query () -> async Nat;
    };
    
    // Stable storage
    private stable var lastPayoutTime : Int = 0;
    
    // Runtime storage
    private var isProcessing : Bool = false;
    private var totalPayoutsProcessed : Nat64 = 0;
    private var totalPayoutAmount : Nat64 = 0;
    private var failedTransfers : Nat64 = 0;
    private var nextScheduledPayout : Int = 0;
    
    // Calculate payout amount
    private func calculatePayout(nftCount: Nat) : Nat {
        let totalValue : Nat = nftCount * Nat64.toNat(NFT_VALUE);
        Debug.print("Total value: " # formatZombieAmount(totalValue));
        let annualPayout : Nat = (totalValue * Nat64.toNat(APY_PERCENT)) / 100;
        Debug.print("Annual payout: " # formatZombieAmount(annualPayout));
        let payoutPerPeriod : Nat = annualPayout / Nat64.toNat(PAYOUTS_PER_YEAR);
        Debug.print("Payout per period: " # formatZombieAmount(payoutPerPeriod));
        payoutPerPeriod
    };
    
    // Get canister balance
    public shared func get_balance() : async Nat64 {
        let account = {
            owner = Principal.fromActor(Payout);
            subaccount = null;
        };
        let balance = await iczombies.icrc1_balance_of(account);
        Nat64.fromNat(balance)
    };
    
    // Helper function to format Zombie token amount
    private func formatZombieAmount(amount: Nat) : Text {
        let whole = amount / 100_000_000;
        let decimal = amount % 100_000_000;
        let decimalStr = Nat.toText(decimal);
        let paddedDecimal = if (decimalStr.size() < 8) {
            let zeros = "00000000";
            let paddingSize = 8 - decimalStr.size();
            let padding = if (paddingSize == 1) { "0" }
                         else if (paddingSize == 2) { "00" }
                         else if (paddingSize == 3) { "000" }
                         else if (paddingSize == 4) { "0000" }
                         else if (paddingSize == 5) { "00000" }
                         else if (paddingSize == 6) { "000000" }
                         else if (paddingSize == 7) { "0000000" }
                         else { "00000000" };
            padding # decimalStr;
        } else {
            decimalStr;
        };
        Nat.toText(whole) # "." # paddedDecimal;
    };

    // Process payouts with optimizations
    public shared func processPayouts() : async () {
        if (isProcessing) {
            logMainnetEvent("Payout already in progress");
            return;
        };
        
        if (isPaused) {
            logMainnetEvent("Payouts are currently paused");
            return;
        };

        // Check canister balance
        let balance = await get_balance();
        logMainnetEvent("Current canister balance: " # formatZombieAmount(Nat64.toNat(balance)));
        
        if (balance < MIN_BALANCE_THRESHOLD) {
            logMainnetEvent("Insufficient balance for payouts: " # formatZombieAmount(Nat64.toNat(balance)));
            return;
        };

        isProcessing := true;
        let currentTime = Time.now();
        var localPayoutsProcessed : Nat64 = 0;
        var localPayoutAmount : Nat64 = 0;
        var localFailedTransfers : Nat64 = 0;

        try {
            // Get all holders from wallet canister
            var holders = await wallet.get_all_holders();
            Debug.print("Found " # Nat.toText(holders.size()) # " holders to process");

            // If no holders, set up a test holder
            if (holders.size() == 0) {
                Debug.print("No holders found, creating test holder");
                let testHolder = Principal.fromText("2vxsx-fae");
                let testHolderInfo = { gg_count = Nat64.fromNat(0); daku_count = Nat64.fromNat(0); last_updated = Nat64.fromNat(0); total_count = Nat64.fromNat(1) };
                holders := [(testHolder, testHolderInfo)];
            };

            // Process each holder
            for ((holder, holderInfo) in holders.vals()) {
                let nftCount = Nat64.toNat(holderInfo.total_count);
                if (nftCount > 0) {
                    let payoutAmount = calculatePayout(nftCount);
                    if (payoutAmount >= Nat64.toNat(MIN_PAYOUT_AMOUNT)) {
                        Debug.print("Processing payout for holder " # Principal.toText(holder) # 
                            " with " # Nat.toText(nftCount) # " NFTs, payout amount: " # 
                            formatZombieAmount(payoutAmount) # " Zombie tokens");

                        var retryCount = 0;
                        var success = false;
                        
                        while (not success and retryCount < MAX_RETRIES) {
                            try {
                                Debug.print("Attempting transfer for holder " # Principal.toText(holder) # 
                                    " with amount " # formatZombieAmount(payoutAmount) # " Zombie tokens");
                                let result = await iczombies.icrc1_transfer({
                                    to = {
                                        owner = holder;
                                        subaccount = null;
                                    };
                                    fee = ?10_000_000;
                                    memo = null;
                                    from_subaccount = null;
                                    created_at_time = null;
                                    amount = payoutAmount;
                                });
                                
                                // Process transfer result
                                switch (result) {
                                    case (#Ok(txId)) {
                                        logMainnetEvent("Transfer successful for " # Principal.toText(holder) # ". TxId: " # Nat.toText(txId));
                                        localPayoutsProcessed += 1;
                                        totalPayoutsProcessed += 1;
                                        totalPayoutAmount += Nat64.fromNat(payoutAmount);
                                    };
                                    case (#Err(e)) {
                                        // Log detailed error based on the specific error type
                                        switch (e) {
                                            case (#InsufficientFunds(balanceInfo)) {
                                                logMainnetEvent("Transfer failed: Insufficient funds. Balance: " # Nat.toText(balanceInfo.balance));
                                            };
                                            case (#BadFee(feeInfo)) {
                                                logMainnetEvent("Transfer failed: Bad fee. Expected: " # Nat.toText(feeInfo.expected_fee));
                                            };
                                            case (#BadBurn(burnInfo)) {
                                                logMainnetEvent("Transfer failed: Bad burn. Min amount: " # Nat.toText(burnInfo.min_burn_amount));
                                            };
                                            case (#CreatedInFuture(timeInfo)) {
                                                logMainnetEvent("Transfer failed: Created in future. Ledger time: " # Nat64.toText(timeInfo.ledger_time));
                                            };
                                            case (#TooOld) {
                                                logMainnetEvent("Transfer failed: Transaction too old");
                                            };
                                            case (#Duplicate(dupInfo)) {
                                                logMainnetEvent("Transfer failed: Duplicate transaction. Duplicate of: " # Nat.toText(dupInfo.duplicate_of));
                                            };
                                            case (#TemporarilyUnavailable) {
                                                logMainnetEvent("Transfer failed: Temporarily unavailable");
                                            };
                                            case (#GenericError(errInfo)) {
                                                logMainnetEvent("Transfer failed: " # errInfo.message # " (Code: " # Nat.toText(errInfo.error_code) # ")");
                                            };
                                        };
                                        failedTransfers += 1;
                                        logMainnetEvent("Failed to transfer " # formatZombieAmount(payoutAmount) # " ZOMB to " # Principal.toText(holder));
                                    };
                                };
                            } catch (e) {
                                Debug.print("Error during transfer: " # Error.message(e));
                                retryCount += 1;
                            };
                        };
                    };
                };
            };

            // Update last payout time and stats
            lastPayoutTime := currentTime;
            nextScheduledPayout := currentTime + PAYOUT_INTERVAL;
            totalPayoutsProcessed += localPayoutsProcessed;
            totalPayoutAmount += localPayoutAmount;
            failedTransfers += localFailedTransfers;
            
            // Log final stats
            Debug.print("Payout completed. Processed " # Nat64.toText(localPayoutsProcessed) # 
                " holders, total amount: " # formatZombieAmount(Nat64.toNat(localPayoutAmount)) # 
                " Zombie tokens, failed transfers: " # Nat64.toText(localFailedTransfers));
        } catch (e) {
            Debug.print("Error during payout process: " # Error.message(e));
        } finally {
            isProcessing := false;
        };
    };
    
    // Get stats
    public query func get_stats() : async Stats {
        {
            last_payout_time = lastPayoutTime;
            next_payout_time = nextScheduledPayout;
            total_payouts_processed = totalPayoutsProcessed;
            total_payout_amount = totalPayoutAmount;
            failed_transfers = failedTransfers;
            is_processing = isProcessing;
        }
    };

    // Emergency reset for stuck processing state
    public shared func emergencyReset() : async () {
        isProcessing := false;
        logMainnetEvent("Emergency reset executed. Processing state reset to false.");
    };

    // Test payout to specific address
    public shared func testDirectPayout() : async () {
        let testAddress = Principal.fromText("ld5uj-tgxfi-jgmdx-ikekg-uu62k-dhhrf-s6jav-3sdbh-4yamx-yzwrs-pqe");
        let payoutAmount : Nat = 100_000_000; // 1 token for testing
        
        logMainnetEvent("Testing direct payout to " # Principal.toText(testAddress) # " with amount " # formatZombieAmount(payoutAmount));
        
        try {
            let result = await iczombies.icrc1_transfer({
                to = {
                    owner = testAddress;
                    subaccount = null;
                };
                fee = null; // Let the token canister decide the fee
                memo = null;
                from_subaccount = null;
                created_at_time = null;
                amount = payoutAmount;
            });
            
            switch (result) {
                case (#Ok(txId)) {
                    logMainnetEvent("Test transfer successful. TxId: " # Nat.toText(txId));
                };
                case (#Err(e)) {
                    switch (e) {
                        case (#InsufficientFunds(balanceInfo)) {
                            logMainnetEvent("Test transfer failed: Insufficient funds. Balance: " # Nat.toText(balanceInfo.balance));
                        };
                        case (#BadFee(feeInfo)) {
                            logMainnetEvent("Test transfer failed: Bad fee. Expected: " # Nat.toText(feeInfo.expected_fee));
                        };
                        case (#BadBurn(burnInfo)) {
                            logMainnetEvent("Test transfer failed: Bad burn. Min amount: " # Nat.toText(burnInfo.min_burn_amount));
                        };
                        case (#CreatedInFuture(timeInfo)) {
                            logMainnetEvent("Test transfer failed: Created in future. Ledger time: " # Nat64.toText(timeInfo.ledger_time));
                        };
                        case (#TooOld) {
                            logMainnetEvent("Test transfer failed: Transaction too old");
                        };
                        case (#Duplicate(dupInfo)) {
                            logMainnetEvent("Test transfer failed: Duplicate transaction. Duplicate of: " # Nat.toText(dupInfo.duplicate_of));
                        };
                        case (#TemporarilyUnavailable) {
                            logMainnetEvent("Test transfer failed: Temporarily unavailable");
                        };
                        case (#GenericError(errInfo)) {
                            logMainnetEvent("Test transfer failed: " # errInfo.message # " (Code: " # Nat.toText(errInfo.error_code) # ")");
                        };
                    };
                };
            };
        } catch (e) {
            logMainnetEvent("Error during test transfer: " # Error.message(e));
        };
    };
    
    // Get error logs for debugging
    public query func getErrorLogs() : async [Text] {
        errorLogs
    };
} 