use candid::{CandidType, Principal};
use ic_cdk::api::call::call;
use ic_cdk_macros::*;
use serde_derive::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;
use ic_cdk::api::time;

#[derive(CandidType, Serialize, Deserialize, Clone, Default, Debug)]
struct NFTProgress {
    count: u64,
    in_progress: bool,
    last_updated: u64, // Timestamp in nanoseconds for caching
}

#[derive(CandidType, Deserialize, Debug)]
struct NFTRecord {
    id: u64,
    owner: Principal,
    metadata: Vec<(String, String)>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
struct HolderInfo {
    daku_count: u64,
    gg_count: u64,
    total_count: u64,
    last_updated: u64,
}

// Constants for external canister IDs
const DAKU_MOTOKO_CANISTER: &str = "erfen-7aaaa-aaaap-ahniq-cai";
const GG_ALBUM_CANISTER: &str = "v6gck-vqaaa-aaaal-qi3sa-cai";
const CACHE_DURATION: u64 = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds

thread_local! {
    static BALANCES: RefCell<HashMap<Principal, u64>> = RefCell::new(HashMap::new());
    static NFT_COUNTS: RefCell<HashMap<Principal, NFTProgress>> = RefCell::new(HashMap::new());
    static HOLDER_INFO: RefCell<HashMap<Principal, HolderInfo>> = RefCell::new(HashMap::new());
    static LAST_BULK_UPDATE: RefCell<u64> = RefCell::new(0);
}

// Helper function to query NFT count from an external canister
async fn get_nft_count_from_canister(canister_id: &str, user: Principal) -> Result<u64, String> {
    let canister = Principal::from_text(canister_id).expect("Invalid canister ID");
    
    // Query the external canister for NFT tokens
    let response: Result<(Vec<NFTRecord>,), _> = call(
        canister,
        "getTokens",
        (user,),
    ).await;

    match response {
        Ok((tokens,)) => Ok(tokens.len() as u64),
        Err(e) => Err(format!("Failed to query canister {}: {:?}", canister_id, e))
    }
}

// Helper function to get all NFT holders from a canister
async fn get_all_holders_from_canister(canister_id: &str) -> Result<HashMap<Principal, u64>, String> {
    let canister = Principal::from_text(canister_id).expect("Invalid canister ID");
    
    // Query all NFTs from the canister
    let response: Result<(Vec<NFTRecord>,), _> = call(
        canister,
        "getAllTokens",  // Method to get all tokens
        (),
    ).await;

    match response {
        Ok((tokens,)) => {
            let mut holder_counts = HashMap::new();
            for token in tokens {
                *holder_counts.entry(token.owner).or_insert(0) += 1;
            }
            Ok(holder_counts)
        },
        Err(e) => Err(format!("Failed to query canister {}: {:?}", canister_id, e))
    }
}

// Function to update all holder information
#[update]
async fn update_all_holders() -> u64 {
    let current_time = time();
    
    // Get holders from both canisters
    let daku_holders = get_all_holders_from_canister(DAKU_MOTOKO_CANISTER).await.unwrap_or_default();
    let gg_holders = get_all_holders_from_canister(GG_ALBUM_CANISTER).await.unwrap_or_default();

    // Combine and update holder information
    let mut all_holders = HashMap::new();
    
    // Process Daku holders
    for (principal, count) in daku_holders {
        let holder_info = all_holders.entry(principal).or_insert(HolderInfo {
            daku_count: 0,
            gg_count: 0,
            total_count: 0,
            last_updated: current_time,
        });
        holder_info.daku_count = count;
        holder_info.total_count += count;
    }

    // Process GG holders
    for (principal, count) in gg_holders {
        let holder_info = all_holders.entry(principal).or_insert(HolderInfo {
            daku_count: 0,
            gg_count: 0,
            total_count: 0,
            last_updated: current_time,
        });
        holder_info.gg_count = count;
        holder_info.total_count += count;
    }

    // Update the global state
    HOLDER_INFO.with(|holder_info| {
        *holder_info.borrow_mut() = all_holders.clone();
    });

    // Update NFT_COUNTS for compatibility
    NFT_COUNTS.with(|counts| {
        let mut counts = counts.borrow_mut();
        for (principal, info) in &all_holders {
            counts.insert(*principal, NFTProgress {
                count: info.total_count,
                in_progress: false,
                last_updated: current_time,
            });
        }
    });

    LAST_BULK_UPDATE.with(|last_update| {
        *last_update.borrow_mut() = current_time;
    });

    all_holders.len() as u64
}

// Function to get all holder information
#[query]
fn get_all_holders() -> Vec<(Principal, HolderInfo)> {
    HOLDER_INFO.with(|holder_info| {
        holder_info.borrow().iter()
            .map(|(k, v)| (*k, v.clone()))
            .collect()
    })
}

// Modified get_nft_count to use the new holder info
#[query]
fn get_nft_count(user: Principal) -> NFTProgress {
    let current_time = time();
    
    // Check if we need a bulk update
    let needs_update = LAST_BULK_UPDATE.with(|last_update| {
        current_time - *last_update.borrow() > CACHE_DURATION
    });

    if needs_update {
        NFTProgress {
            count: HOLDER_INFO.with(|holder_info| {
                holder_info.borrow()
                    .get(&user)
                    .map(|info| info.total_count)
                    .unwrap_or(0)
            }),
            in_progress: true,
            last_updated: current_time,
        }
    } else {
        HOLDER_INFO.with(|holder_info| {
            holder_info.borrow()
                .get(&user)
                .map(|info| NFTProgress {
                    count: info.total_count,
                    in_progress: false,
                    last_updated: info.last_updated,
                })
                .unwrap_or_default()
        })
    }
}

#[update]
fn update_balance(user: Principal, amount: u64) -> u64 {
    BALANCES.with(|balances| {
        let mut balances = balances.borrow_mut();
        let current = balances.entry(user).or_insert(0);
        *current = amount;
        *current
    })
}

#[query]
fn get_balance(user: Principal) -> u64 {
    BALANCES.with(|balances| {
        balances.borrow().get(&user).copied().unwrap_or(0)
    })
}

#[update]
async fn update_nft_count(user: Principal) -> u64 {
    // Query external NFT canisters
    let daku_count = get_nft_count_from_canister(DAKU_MOTOKO_CANISTER, user).await;
    let gg_count = get_nft_count_from_canister(GG_ALBUM_CANISTER, user).await;

    let total_count = daku_count.unwrap_or(0) + gg_count.unwrap_or(0);

    NFT_COUNTS.with(|counts| {
        let mut counts = counts.borrow_mut();
        let progress = counts.entry(user).or_insert(NFTProgress::default());
        progress.count = total_count;
        progress.in_progress = false;
        progress.last_updated = time();
        total_count
    })
}

#[query]
fn get_all_nft_counts() -> Vec<(Principal, NFTProgress)> {
    NFT_COUNTS.with(|counts| {
        counts.borrow().iter()
            .map(|(k, v)| (*k, v.clone()))
            .collect()
    })
} 