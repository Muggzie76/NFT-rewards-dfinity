import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Nat64 "mo:base/Nat64";
import Debug "mo:base/Debug";

actor {
    // Define the interfaces for the wallet and payout canisters
    public type WalletCanister = actor {
        load_csv_data : (Text, Text) -> async Bool;
        update_all_holders : () -> async Nat64;
        get_all_holders : () -> async [(Principal, HolderInfo)];
    };

    public type PayoutCanister = actor {
        force_payout : () -> async ();
    };

    public type HolderInfo = {
        daku_count: Nat64;
        gg_count: Nat64;
        total_count: Nat64;
        last_updated: Nat64;
    };

    // Define the canister IDs
    let wallet_canister_id : Text = "rce3q-iaaaa-aaaap-qpyfa-cai";
    let payout_canister_id : Text = "zeqfj-qyaaa-aaaaf-qanua-cai";

    // GG Album Release CSV data
    let gg_csv_data : Text = "accountIdentifier,principal,tokenIds,numberOfTokens
eba62ff09790de35107a9502cf673a708f5ce4aa9ad04d0e862349c9d25935f8,cd3yv-nkb2m-mjvnb-naicp-mkqk2-g4f3d-g7y4g-xdeaz-n6i75-xur54-xae,2333,2
f44c18611325ddf715e8a8a6f8e8308f2606b2ebc5ca5102f8a4f97981128450,wxnnz-bart4-tsufm-hvz3u-fhcgm-vb5yu-ilba5-7qaui-25eg5-nsmbg-zqe,4;7;9;1962;10;92;103;87;104,8
61a14b047702783700379608d2a86248eb30721709ce3b807ec5a8571f7fc390,hxdpn-hxyoy-em7uq-73yoz-fcese-vwdzn-fcdtu-p746p-e3fkm-rxnhk-cqe,2434,1
6dd704fa7216e3d876eccc871eb877d7435e1b298ec8c3237c3771b94874e003,rce3q-iaaaa-aaaap-qpyfa-cai,117,1
3b93d4fd8631b8c57a073805a5d2c660e60685ac3b008f07469d726a2cff7163,wn3ei-naq75-oaat7-aouae-xtwxx-o4ytg-gjalf-pj43x-zsabp-uaopu-yqe,166,1
f4f1b3432c1d666b8784802207f71a0252586237676be9bb53c160a9faad0d38,654dy-i57dp-77fx5-o73ug-qeorm-y53i2-3ct3i-354oj-jvgy7-nml4n-qae,33,1
ccfdf8c671056aa5dbd9a7bd8682903ff1a6376d46f76308c4bbf8fe29590df8,dew2c-oslno-ls7hp-3adol-vevbv-vi37c-nn4tx-7eaeg-33kr4-smnth-sae,28,1";

    // Daku Motoko CSV data
    let daku_csv_data : Text = "accountIdentifier,principal,tokenIds,numberOfTokens
eba62ff09790de35107a9502cf673a708f5ce4aa9ad04d0e862349c9d25935f8,cd3yv-nkb2m-mjvnb-naicp-mkqk2-g4f3d-g7y4g-xdeaz-n6i75-xur54-xae,2333,3
f44c18611325ddf715e8a8a6f8e8308f2606b2ebc5ca5102f8a4f97981128450,wxnnz-bart4-tsufm-hvz3u-fhcgm-vb5yu-ilba5-7qaui-25eg5-nsmbg-zqe,4;7;9;1962;10;92,0
b1569a59eea517235679a67be1d1df9b5a6c700656b56116e71f8e14b3f2a585,jt6pq-pfact-6nq4w-xpd7l-jvsh3-ghmvo-yp34h-pmon5-5dcjo-rygay-sqe,98;83;101;102;167;169,100
61a14b047702783700379608d2a86248eb30721709ce3b807ec5a8571f7fc390,hxdpn-hxyoy-em7uq-73yoz-fcese-vwdzn-fcdtu-p746p-e3fkm-rxnhk-cqe,2434,5
6dd704fa7216e3d876eccc871eb877d7435e1b298ec8c3237c3771b94874e003,rce3q-iaaaa-aaaap-qpyfa-cai,117,1
3b93d4fd8631b8c57a073805a5d2c660e60685ac3b008f07469d726a2cff7163,wn3ei-naq75-oaat7-aouae-xtwxx-o4ytg-gjalf-pj43x-zsabp-uaopu-yqe,166,2";

    // Load the CSV data and trigger a payout
    public shared func load_data_and_payout() : async Text {
        // Connect to the wallet canister
        let wallet_canister : WalletCanister = actor(wallet_canister_id);
        
        // Log the process
        Debug.print("Loading CSV data into wallet canister...");
        
        // Load the CSV data
        let csv_loaded = await wallet_canister.load_csv_data(gg_csv_data, daku_csv_data);
        
        if (not csv_loaded) {
            return "Failed to load CSV data into wallet canister.";
        };
        
        Debug.print("CSV data loaded successfully. Updating all holders...");
        
        // Update all holders
        let total_holders = await wallet_canister.update_all_holders();
        
        Debug.print("All holders updated. Total holders: " # Nat64.toText(total_holders));
        
        // Connect to the payout canister
        let payout_canister : PayoutCanister = actor(payout_canister_id);
        
        // Trigger a payout
        Debug.print("Triggering payout...");
        await payout_canister.force_payout();
        
        return "Successfully loaded CSV data, updated holders, and triggered a payout. Total holders: " # Nat64.toText(total_holders);
    };
    
    // Query function to check the result
    public query func get_info() : async Text {
        return "Use the load_data_and_payout() function to load CSV data and trigger a payout.";
    };
} 