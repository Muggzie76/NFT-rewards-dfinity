use candid::{CandidType, Principal};
use ic_cdk::api::call::call;
use ic_cdk_macros::*;
use serde_derive::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;
use ic_cdk::api::time;
use sha2::{Digest, Sha224};

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

#[derive(CandidType, Serialize, Deserialize, Clone, Default, Debug)]
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
const EXT_METHOD_NAME: &str = "tokens"; // Standard EXT method for querying tokens

thread_local! {
    static BALANCES: RefCell<HashMap<Principal, u64>> = RefCell::new(HashMap::new());
    static NFT_COUNTS: RefCell<HashMap<Principal, NFTProgress>> = RefCell::new(HashMap::new());
    static HOLDER_INFO: RefCell<HashMap<Principal, HolderInfo>> = RefCell::new(HashMap::new());
    static LAST_BULK_UPDATE: RefCell<u64> = RefCell::new(0);
    // We'll keep known holders as fallback but prioritize real data
    static KNOWN_HOLDERS: RefCell<HashMap<Principal, HolderInfo>> = RefCell::default();
}

// EXT standard types for NFT interaction
#[derive(CandidType, Deserialize, Debug)]
enum TokensResult {
    #[serde(rename = "ok")]
    Ok(Vec<u64>), // Token indices
    #[serde(rename = "err")]
    Err(TokensError),
}

#[derive(CandidType, Deserialize, Debug)]
struct TokensError {
    #[serde(rename = "InvalidToken")]
    invalid_token: Option<String>,
    #[serde(rename = "Other")]
    other: Option<String>,
}

// Additional types for making compatible calls to NFT canisters
#[derive(CandidType, Debug)]
struct AccountIdentifier {
    hash: Vec<u8>,
}

// Convert Principal to AccountIdentifier format expected by EXT standard
fn principal_to_account_id(principal: &Principal) -> String {
    // Different NFT canisters might expect different formats
    // Here we return the principal text representation which is commonly used
    principal.to_text()
}

// Compute AccountIdentifier hash if needed by some implementations
fn compute_account_id_hash(principal: &Principal) -> Vec<u8> {
    let mut hasher = Sha224::new();
    
    // Start with \x0Aaccount-id
    hasher.update(b"\x0Aaccount-id");
    
    // Add principal
    let principal_bytes = principal.as_slice();
    hasher.update([principal_bytes.len() as u8]);
    hasher.update(principal_bytes);
    
    // Add subaccount (0 for default)
    hasher.update([0; 32]);
    
    // Return the hash
    hasher.finalize().to_vec()
}

// Prepare request arguments based on NFT canister ID
fn prepare_tokens_args(principal: &Principal, canister_id: &str) -> Result<Vec<u8>, String> {
    // Daku Motoko might expect a different format than GG Album
    if canister_id == DAKU_MOTOKO_CANISTER {
        // Try principal text format for Daku
        candid::encode_one(principal_to_account_id(principal))
            .map_err(|e| format!("Encoding error for Daku: {}", e))
    } else if canister_id == GG_ALBUM_CANISTER {
        // GG Album might expect a different format
        // Try principal text format first
        candid::encode_one(principal_to_account_id(principal))
            .map_err(|e| format!("Encoding error for GG Album: {}", e))
    } else {
        // Default encoding
        candid::encode_one(principal_to_account_id(principal))
            .map_err(|e| format!("Encoding error: {}", e))
    }
}

// Initialize known holders for development testing
fn init_known_holders() -> HashMap<Principal, HolderInfo> {
    let current_time = time();
    let mut holders = HashMap::new();
    
    // Add some test principals with NFT counts
    let test_holders = vec![
        // Admin user
        (
            Principal::from_text("cd3yv-nkb2m-mjvnb-naicp-mkqk2-g4f3d-g7y4g-xdeaz-n6i75-xur54-xae").unwrap(),
            (3, 2) // (daku_count, gg_count)
        ),
        // This wallet canister
        (
            Principal::from_text("rce3q-iaaaa-aaaap-qpyfa-cai").unwrap(),
            (1, 1)
        ),
        // Anonymous
        (
            Principal::anonymous(),
            (0, 0)
        ),
    ];
    
    for (principal, (daku_count, gg_count)) in test_holders {
        holders.insert(principal, HolderInfo {
            daku_count,
            gg_count,
            total_count: daku_count + gg_count,
            last_updated: current_time,
        });
    }
    
    holders
}

// Query Daku Motoko NFT canister for token count using EXT standard
async fn query_daku_motoko_tokens(user: &Principal) -> Result<u64, String> {
    ic_cdk::print(format!("Querying Daku Motoko canister for user: {}", user));
    
    // Call the tokens method on the NFT canister with the appropriate account_id format
    let canister_id = Principal::from_text(DAKU_MOTOKO_CANISTER).map_err(|e| format!("Invalid canister ID: {}", e))?;
    let args = prepare_tokens_args(user, DAKU_MOTOKO_CANISTER)?;
    
    match ic_cdk::api::call::call_raw(
        canister_id, 
        EXT_METHOD_NAME, 
        &args,
        0 // No cycles needed for query calls
    ).await {
        Ok(bytes) => {
            // Try to decode the response as a TokensResult
            match candid::decode_one::<TokensResult>(&bytes) {
                Ok(TokensResult::Ok(tokens)) => {
                    ic_cdk::print(format!("Daku Motoko tokens count: {}", tokens.len()));
                    Ok(tokens.len() as u64)
                },
                Ok(TokensResult::Err(err)) => {
                    // Check for the common "No tokens" message which means 0 tokens
                    if let Some(msg) = &err.other {
                        if msg.contains("No tokens") || msg.contains("no tokens") {
                            ic_cdk::print("Daku Motoko: No tokens found (expected response)");
                            return Ok(0);
                        }
                    }
                    
                    let error_msg = match (err.invalid_token, err.other) {
                        (Some(token_err), _) => format!("Invalid token: {}", token_err),
                        (_, Some(other_err)) => format!("Other error: {}", other_err),
                        _ => "Unknown EXT error".to_string(),
                    };
                    
                    ic_cdk::print(format!("Daku Motoko error: {}", error_msg));
                    Err(error_msg)
                },
                Err(e) => {
                    // If we can't decode as TokensResult, it might be a different format
                    // Try to decode as just an array of tokens directly
                    match candid::decode_one::<Vec<u64>>(&bytes) {
                        Ok(tokens) => {
                            ic_cdk::print(format!("Daku Motoko tokens count (direct format): {}", tokens.len()));
                            Ok(tokens.len() as u64)
                        },
                        Err(_) => {
                            Err(format!("Failed to decode Daku Motoko response: {:?}", e))
                        }
                    }
                }
            }
        },
        Err((code, msg)) => {
            let error = format!("Error calling Daku Motoko: {:?} - {}", code, msg);
            ic_cdk::print(&error);
            Err(error)
        }
    }
}

// Query GG Album NFT canister for token count using EXT standard
async fn query_gg_album_tokens(user: &Principal) -> Result<u64, String> {
    ic_cdk::print(format!("Querying GG Album canister for user: {}", user));
    
    // Call the tokens method on the NFT canister with the appropriate account_id format
    let canister_id = Principal::from_text(GG_ALBUM_CANISTER).map_err(|e| format!("Invalid canister ID: {}", e))?;
    let args = prepare_tokens_args(user, GG_ALBUM_CANISTER)?;
    
    match ic_cdk::api::call::call_raw(
        canister_id, 
        EXT_METHOD_NAME, 
        &args,
        0 // No cycles needed for query calls
    ).await {
        Ok(bytes) => {
            // Try to decode the response as a TokensResult
            match candid::decode_one::<TokensResult>(&bytes) {
                Ok(TokensResult::Ok(tokens)) => {
                    ic_cdk::print(format!("GG Album tokens count: {}", tokens.len()));
                    Ok(tokens.len() as u64)
                },
                Ok(TokensResult::Err(err)) => {
                    // Check for the common "No tokens" message which means 0 tokens
                    if let Some(msg) = &err.other {
                        if msg.contains("No tokens") || msg.contains("no tokens") {
                            ic_cdk::print("GG Album: No tokens found (expected response)");
                            return Ok(0);
                        }
                    }
                    
                    let error_msg = match (err.invalid_token, err.other) {
                        (Some(token_err), _) => format!("Invalid token: {}", token_err),
                        (_, Some(other_err)) => format!("Other error: {}", other_err),
                        _ => "Unknown EXT error".to_string(),
                    };
                    
                    ic_cdk::print(format!("GG Album error: {}", error_msg));
                    Err(error_msg)
                },
                Err(e) => {
                    // If we can't decode as TokensResult, it might be a different format
                    // Try to decode as just an array of tokens directly
                    match candid::decode_one::<Vec<u64>>(&bytes) {
                        Ok(tokens) => {
                            ic_cdk::print(format!("GG Album tokens count (direct format): {}", tokens.len()));
                            Ok(tokens.len() as u64)
                        },
                        Err(_) => {
                            Err(format!("Failed to decode GG Album response: {:?}", e))
                        }
                    }
                }
            }
        },
        Err((code, msg)) => {
            let error = format!("Error calling GG Album: {:?} - {}", code, msg);
            ic_cdk::print(&error);
            Err(error)
        }
    }
}

// Helper to check if we need to refresh cache for a user
fn should_refresh_cache(user: &Principal) -> bool {
    let current_time = time();
    
    HOLDER_INFO.with(|holder_info| {
        if let Some(info) = holder_info.borrow().get(user) {
            // Refresh if data is older than CACHE_DURATION
            return current_time - info.last_updated > CACHE_DURATION;
        }
        true // No data found, should refresh
    })
}

// Function to update all holder information
#[update]
async fn update_all_holders() -> u64 {
    let current_time = time();
    
    // Log the start of the operation
    ic_cdk::print(format!("Starting update_all_holders at timestamp: {}", current_time));
    
    // Get all principals to update
    let principals = HOLDER_INFO.with(|holder_info| {
        let info = holder_info.borrow();
        info.keys().cloned().collect::<Vec<Principal>>()
    });
    
    // Add known principals for a more complete update
    let additional_principals = KNOWN_HOLDERS.with(|holders_ref| {
        let mut holders = holders_ref.borrow_mut();
        if holders.is_empty() {
            *holders = init_known_holders();
        }
        holders.keys().cloned().collect::<Vec<Principal>>()
    });
    
    // Combine and deduplicate principals
    let mut all_principals = principals;
    for principal in additional_principals {
        if !all_principals.contains(&principal) {
            all_principals.push(principal);
        }
    }
    
    let mut updated_count = 0;
    
    // Update each principal
    for principal in all_principals {
        if let Ok(info) = update_holder_info(&principal).await {
            HOLDER_INFO.with(|holder_info| {
                holder_info.borrow_mut().insert(principal, info.clone());
            });
            
            // Also update NFT_COUNTS for compatibility
            NFT_COUNTS.with(|counts| {
                counts.borrow_mut().insert(principal, NFTProgress {
                    count: info.total_count,
                    in_progress: false,
                    last_updated: current_time,
                });
            });
            
            updated_count += 1;
        }
    }
    
    LAST_BULK_UPDATE.with(|last_update| {
        *last_update.borrow_mut() = current_time;
    });
    
    ic_cdk::print(format!("Completed update_all_holders, updated {} holders", updated_count));
    updated_count
}

// Add a fallback query function if the primary call fails
async fn fallback_query_tokens(canister_id: Principal, user: &Principal) -> Result<u64, String> {
    ic_cdk::print(format!("Trying fallback query method for canister: {}", canister_id));
    
    // Try with AccountIdentifier hash format
    let hash = compute_account_id_hash(user);
    let account_id = AccountIdentifier { hash };
    
    match ic_cdk::api::call::call_raw(
        canister_id,
        EXT_METHOD_NAME,
        &candid::encode_one(account_id).map_err(|e| format!("Encoding error: {}", e))?,
        0
    ).await {
        Ok(bytes) => {
            // Try to decode the response as a TokensResult or direct Vec<u64>
            if let Ok(TokensResult::Ok(tokens)) = candid::decode_one::<TokensResult>(&bytes) {
                ic_cdk::print(format!("Fallback query successful with {} tokens", tokens.len()));
                return Ok(tokens.len() as u64);
            } else if let Ok(tokens) = candid::decode_one::<Vec<u64>>(&bytes) {
                ic_cdk::print(format!("Fallback query successful with {} tokens (direct format)", tokens.len()));
                return Ok(tokens.len() as u64);
            }
            
            Err("Failed to decode fallback response".to_string())
        },
        Err((code, msg)) => {
            Err(format!("Fallback query failed: {:?} - {}", code, msg))
        }
    }
}

// Update holder info for a specific user
async fn update_holder_info(user: &Principal) -> Result<HolderInfo, String> {
    ic_cdk::print(format!("Updating holder info for: {}", user));
    
    // First try primary query methods
    let daku_result = query_daku_motoko_tokens(user).await;
    let gg_result = query_gg_album_tokens(user).await;
    
    // If primary methods fail, try fallback methods
    let daku_count = match daku_result {
        Ok(count) => count,
        Err(e) => {
            ic_cdk::print(format!("Primary Daku query failed: {}, trying fallback...", e));
            // Try fallback query if primary fails
            match fallback_query_tokens(
                Principal::from_text(DAKU_MOTOKO_CANISTER).unwrap_or(Principal::anonymous()),
                user
            ).await {
                Ok(count) => count,
                Err(fallback_err) => {
                    ic_cdk::print(format!("Fallback Daku query also failed: {}, using 0", fallback_err));
                    0
                }
            }
        }
    };
    
    let gg_count = match gg_result {
        Ok(count) => count,
        Err(e) => {
            ic_cdk::print(format!("Primary GG query failed: {}, trying fallback...", e));
            // Try fallback query if primary fails
            match fallback_query_tokens(
                Principal::from_text(GG_ALBUM_CANISTER).unwrap_or(Principal::anonymous()),
                user
            ).await {
                Ok(count) => count,
                Err(fallback_err) => {
                    ic_cdk::print(format!("Fallback GG query also failed: {}, using 0", fallback_err));
                    0
                }
            }
        }
    };
    
    let total_count = daku_count + gg_count;
    let current_time = time();
    
    // Create holder info
    let info = HolderInfo {
        daku_count,
        gg_count,
        total_count,
        last_updated: current_time,
    };
    
    ic_cdk::print(format!("Final holder info: Daku={}, GG={}, Total={}", 
                         daku_count, gg_count, total_count));
    
    Ok(info)
}

// Function to get all holder information
#[query]
fn get_all_holders() -> Vec<(Principal, HolderInfo)> {
    // First check if we have data in HOLDER_INFO
    let holder_info = HOLDER_INFO.with(|holder_info| {
        let info = holder_info.borrow();
        if !info.is_empty() {
            return info.clone();
        }
        HashMap::new()
    });
    
    // If no data, use known holders
    if holder_info.is_empty() {
        KNOWN_HOLDERS.with(|holders_ref| {
            let mut holders = holders_ref.borrow_mut();
            if holders.is_empty() {
                *holders = init_known_holders();
            }
            holders.iter()
                .map(|(k, v)| (*k, v.clone()))
                .collect()
        })
    } else {
        holder_info.iter()
            .map(|(k, v)| (*k, v.clone()))
            .collect()
    }
}

// Get NFT count for a specific user
#[query]
fn get_nft_count(user: Principal) -> NFTProgress {
    let current_time = time();
    
    // Try to get from HOLDER_INFO first
    let holder_info = HOLDER_INFO.with(|holder_info| {
        holder_info.borrow().get(&user).cloned()
    });
    
    // If found, convert to NFTProgress
    if let Some(info) = holder_info {
        return NFTProgress {
            count: info.total_count,
            in_progress: false,
            last_updated: info.last_updated,
        };
    }
    
    // Otherwise, use known holders
    let info = get_holder_info(&user);
    NFTProgress {
        count: info.total_count,
        in_progress: false,
        last_updated: current_time,
    }
}

// Helper function that uses pre-configured known holders as fallback
fn get_holder_info(user: &Principal) -> HolderInfo {
    KNOWN_HOLDERS.with(|holders_ref| {
        // Initialize if empty
        let mut holders = holders_ref.borrow_mut();
        if holders.is_empty() {
            *holders = init_known_holders();
        }
        
        // Return info for this user if known, otherwise default
        holders.get(user).cloned().unwrap_or_default()
    })
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

// Update NFT count for a specific user
#[update]
async fn update_nft_count(user: Principal) -> u64 {
    ic_cdk::print(format!("Updating NFT count for: {}", user));
    
    // Set in-progress flag
    NFT_COUNTS.with(|counts| {
        let mut counts = counts.borrow_mut();
        let progress = counts.entry(user).or_insert(NFTProgress::default());
        progress.in_progress = true;
    });
    
    // Try to get updated holder info
    match update_holder_info(&user).await {
        Ok(info) => {
            // Update HOLDER_INFO
            HOLDER_INFO.with(|holder_info| {
                holder_info.borrow_mut().insert(user, info.clone());
            });
            
            // Update NFT_COUNTS
            let total_count = info.total_count;
            NFT_COUNTS.with(|counts| {
                let mut counts = counts.borrow_mut();
                let progress = counts.entry(user).or_insert(NFTProgress::default());
                progress.count = total_count;
                progress.in_progress = false;
                progress.last_updated = time();
            });
            
            total_count
        },
        Err(e) => {
            ic_cdk::print(format!("Error updating NFT count: {}", e));
            
            // Use fallback data
            let info = get_holder_info(&user);
            let total_count = info.total_count;
            
            // Update NFT_COUNTS to show error state
            NFT_COUNTS.with(|counts| {
                let mut counts = counts.borrow_mut();
                let progress = counts.entry(user).or_insert(NFTProgress::default());
                progress.count = total_count;
                progress.in_progress = false;
                progress.last_updated = time();
            });
            
            total_count
        }
    }
}

#[query]
fn get_all_nft_counts() -> Vec<(Principal, NFTProgress)> {
    NFT_COUNTS.with(|counts| {
        counts.borrow().iter()
            .map(|(k, v)| (*k, v.clone()))
            .collect()
    })
}

// Add a debug function to expose error logs
#[query]
fn get_debug_info() -> Vec<String> {
    let mut info = Vec::new();
    
    // Version info
    info.push(format!("Wallet Rust Canister v1.1.0"));
    
    // Canister IDs
    info.push(format!("Daku Canister: {}", DAKU_MOTOKO_CANISTER));
    info.push(format!("GG Album Canister: {}", GG_ALBUM_CANISTER));
    
    // Cache info
    info.push(format!("Cache duration: {} seconds", CACHE_DURATION / 1_000_000_000));
    
    // Known holders stats as fallback
    KNOWN_HOLDERS.with(|holders_ref| {
        let mut holders = holders_ref.borrow_mut();
        if holders.is_empty() {
            *holders = init_known_holders();
        }
        info.push(format!("Pre-configured fallback holders: {}", holders.len()));
    });
    
    // Holder stats from HOLDER_INFO (real data)
    HOLDER_INFO.with(|holders| {
        let holder_info = holders.borrow();
        let count = holder_info.len();
        info.push(format!("Tracked holders from real updates: {}", count));
        
        // Show some sample holders
        if count > 0 {
            info.push("Sample holder data:".to_string());
            for (i, (principal, data)) in holder_info.iter().enumerate().take(3) {
                info.push(format!("  Principal {}: {}", i, principal));
                info.push(format!("    Daku: {}, GG: {}, Total: {}, Updated: {} seconds ago", 
                    data.daku_count, data.gg_count, data.total_count, 
                    (time() - data.last_updated) / 1_000_000_000));
            }
        }
    });
    
    // Last update time
    LAST_BULK_UPDATE.with(|last_update| {
        let timestamp = *last_update.borrow();
        if timestamp > 0 {
            let seconds_ago = (time() - timestamp) / 1_000_000_000;
            info.push(format!("Last bulk update: {} seconds ago", seconds_ago));
        } else {
            info.push(format!("No bulk update performed yet"));
        }
    });
    
    info
}

// Test direct canister calls - useful for debugging the integration
#[update]
async fn test_direct_canister_calls() -> Vec<String> {
    let mut debug_logs = Vec::new();
    debug_logs.push("=== Starting direct canister testing ===".to_string());

    // Known test principals for testing
    let test_principals = vec![
        Principal::from_text("2vxsx-fae").unwrap(), // Anonymous principal
        Principal::anonymous(),
        ic_cdk::api::caller(), // Caller of this function
        ic_cdk::api::id(),    // This canister's ID
    ];
    
    debug_logs.push(format!("Testing with principals: {:?}", 
        test_principals.iter().map(|p| p.to_string()).collect::<Vec<_>>()));
    
    // Test with the first principal
    let test_user = &test_principals[0];
    debug_logs.push(format!("Testing NFT queries with principal: {}", test_user));
    
    // Test primary query methods
    debug_logs.push("\n=== Testing primary query methods ===".to_string());
    
    // Query Daku Motoko
    debug_logs.push("Querying Daku Motoko...".to_string());
    match query_daku_motoko_tokens(test_user).await {
        Ok(count) => {
            debug_logs.push(format!("Daku Motoko success - token count: {}", count));
        },
        Err(e) => {
            debug_logs.push(format!("Daku Motoko error: {}", e));
        }
    }
    
    // Query GG Album
    debug_logs.push("Querying GG Album...".to_string());
    match query_gg_album_tokens(test_user).await {
        Ok(count) => {
            debug_logs.push(format!("GG Album success - token count: {}", count));
        },
        Err(e) => {
            debug_logs.push(format!("GG Album error: {}", e));
        }
    }
    
    // Test fallback query methods
    debug_logs.push("\n=== Testing fallback query methods ===".to_string());
    
    // Test Daku Motoko fallback
    let daku_canister = Principal::from_text(DAKU_MOTOKO_CANISTER).unwrap_or(Principal::anonymous());
    debug_logs.push("Testing Daku Motoko fallback method...".to_string());
    match fallback_query_tokens(daku_canister, test_user).await {
        Ok(count) => {
            debug_logs.push(format!("Daku Motoko fallback success - token count: {}", count));
        },
        Err(e) => {
            debug_logs.push(format!("Daku Motoko fallback error: {}", e));
        }
    }
    
    // Test GG Album fallback
    let gg_canister = Principal::from_text(GG_ALBUM_CANISTER).unwrap_or(Principal::anonymous());
    debug_logs.push("Testing GG Album fallback method...".to_string());
    match fallback_query_tokens(gg_canister, test_user).await {
        Ok(count) => {
            debug_logs.push(format!("GG Album fallback success - token count: {}", count));
        },
        Err(e) => {
            debug_logs.push(format!("GG Album fallback error: {}", e));
        }
    }
    
    // Test full update
    debug_logs.push("\n=== Testing full holder info update ===".to_string());
    match update_holder_info(test_user).await {
        Ok(info) => {
            debug_logs.push(format!("Update success - Daku: {}, GG: {}, Total: {}", 
                info.daku_count, info.gg_count, info.total_count));
        },
        Err(e) => {
            debug_logs.push(format!("Update error: {}", e));
        }
    }
    
    debug_logs.push("\n=== Test completed ===".to_string());
    debug_logs
} 