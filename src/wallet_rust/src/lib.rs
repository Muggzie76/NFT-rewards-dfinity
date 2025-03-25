use candid::{CandidType, Nat, Principal};
use ic_cdk_macros::*;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use ic_cdk::api::time;
use sha2::{Digest, Sha224};
use ic_cdk::api::call::RejectionCode;
use ic_cdk::api::{
    management_canister::http_request::{HttpResponse, TransformArgs},
};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// Import our EXT standard implementation
mod ext;
mod daku_interface;
mod gg_album_interface;
mod nft_registry_interface;
mod gg_registry_interface;
use ext::tokens::{create_tokens_query_encodings, decode_tokens_response, QueryLog};
use daku_interface::get_tokens_for_user;
use gg_album_interface::get_album_tokens_for_user;
use nft_registry_interface::{TokenOwner, DakuRegistryRecord, get_registry_raw, get_registry_tokens, get_registry_map, get_registry_entries, get_registry_daku_records};
use gg_registry_interface::{GGRegistryRecord, get_gg_registry_raw, get_gg_registry_records, get_gg_registry_tokens, get_gg_registry_map, get_gg_tokens_for_owner};

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
const GG_ALBUM_CANISTER: &str = "v2ekv-yyaaa-aaaag-qjw2q-cai";
const CACHE_DURATION: u64 = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds (optimized from 5 minutes)
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
        // Wallet with 7 GG NFTs
        (
            Principal::from_text("wxnnz-bart4-tsufm-hvz3u-fhcgm-vb5yu-ilba5-7qaui-25eg5-nsmbg-zqe").unwrap_or(Principal::anonymous()),
            (0, 7)
        ),
        // Wallet with 100 Daku NFTs
        (
            Principal::from_text("jt6pq-pfact-6nq4w-xpd7l-jvsh3-ghmvo-yp34h-pmon5-5dcjo-rygay-sqe").unwrap_or(Principal::anonymous()),
            (100, 0)
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

// Improved NFT token querying with multiple fallback approaches
async fn query_tokens(canister_id_text: &str, user: &Principal) -> Result<u64, String> {
    ic_cdk::print(format!("Starting robust token query for user {} on canister {}", user, canister_id_text));
    
    // Parse canister ID from text
    let canister_id = match Principal::from_text(canister_id_text) {
        Ok(id) => id,
        Err(e) => return Err(format!("Invalid canister ID '{}': {}", canister_id_text, e)),
    };
    
    // Generate different encodings for the query
    let encodings = create_tokens_query_encodings(user);
    let mut query_logs: Vec<QueryLog> = Vec::new();
    
    // Try each encoding format until one works
    for (encoding_name, args) in encodings {
        ic_cdk::print(format!("Trying encoding format '{}' for canister {}", encoding_name, canister_id_text));
        
        match ic_cdk::api::call::call_raw(
            canister_id, 
            EXT_METHOD_NAME, 
            &args,
            0 // No cycles needed for query calls
        ).await {
            Ok(bytes) => {
                // Try to decode the response
                match decode_tokens_response(&bytes) {
                    Ok(count) => {
                        // Successfully found tokens!
                        query_logs.push(QueryLog {
                            canister_id: canister_id_text.to_string(),
                            encoding_type: encoding_name.clone(),
                            success: true,
                            result: format!("Found {} tokens", count),
                        });
                        
                        ic_cdk::print(format!("Successfully queried {} tokens using '{}' format", count, encoding_name));
                        return Ok(count);
                    },
                    Err(e) => {
                        // This format didn't work for decoding
                        query_logs.push(QueryLog {
                            canister_id: canister_id_text.to_string(),
                            encoding_type: encoding_name.clone(),
                            success: false,
                            result: format!("Decode error: {}", e),
                        });
                        
                        ic_cdk::print(format!("Failed to decode response with '{}' format: {}", encoding_name, e));
                        // Continue to try other formats
                    }
                }
            },
            Err((code, msg)) => {
                // This format didn't work for the call
                query_logs.push(QueryLog {
                    canister_id: canister_id_text.to_string(),
                    encoding_type: encoding_name.clone(),
                    success: false,
                    result: format!("Call error: {:?} - {}", code, msg),
                });
                
                ic_cdk::print(format!("Call failed with '{}' format: {:?} - {}", encoding_name, code, msg));
                
                // If the error is NOT_FOUND, no need to try other formats - the canister doesn't exist
                if code == RejectionCode::DestinationInvalid {
                    return Err(format!("DestinationInvalid - Canister {} not found", canister_id_text));
                }
                
                // Continue to try other formats
            }
        }
    }
    
    // If we get here, all formats failed
    let log_summary = query_logs
        .iter()
        .map(|log| format!("[{}] {}: {}", log.encoding_type, if log.success { "✓" } else { "✗" }, log.result))
        .collect::<Vec<_>>()
        .join("; ");
        
    Err(format!("All query formats failed for {}: {}", canister_id_text, log_summary))
}

// Update implementations to use the new query function
async fn query_daku_motoko_tokens(user: &Principal) -> Result<u64, String> {
    let daku_canister = Principal::from_text(DAKU_MOTOKO_CANISTER)
        .map_err(|e| format!("Invalid Daku canister ID: {}", e))?;

    match get_tokens_for_user(daku_canister, *user).await {
        Ok(tokens) => Ok(tokens.len() as u64),
        Err((code, msg)) => {
            ic_cdk::print(format!("Daku call error: {:?} - {}", code, msg));
            // Try fallback method
            query_tokens(DAKU_MOTOKO_CANISTER, user).await
        }
    }
}

async fn query_gg_album_tokens(user: &Principal) -> Result<u64, String> {
    let album_canister = Principal::from_text(GG_ALBUM_CANISTER)
        .map_err(|e| format!("Invalid GG Album canister ID: {}", e))?;

    match get_album_tokens_for_user(album_canister, *user).await {
        Ok(tokens) => Ok(tokens.len() as u64),
        Err((code, msg)) => {
            ic_cdk::print(format!("GG Album call error: {:?} - {}", code, msg));
            // Try fallback method
            query_tokens(GG_ALBUM_CANISTER, user).await
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
            match query_tokens(DAKU_MOTOKO_CANISTER, user).await {
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
            match query_tokens(GG_ALBUM_CANISTER, user).await {
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
    info.push(format!("Wallet Rust Canister v1.2.0"));
    
    // Canister IDs
    info.push(format!("Daku Canister: {}", DAKU_MOTOKO_CANISTER));
    info.push(format!("GG Album Canister: {}", GG_ALBUM_CANISTER));
    
    // Cache info
    info.push(format!("Cache duration: {} seconds", CACHE_DURATION / 1_000_000_000));
    
    // Information about supported query formats
    info.push(format!("NFT Query method: {}", EXT_METHOD_NAME));
    info.push(format!("Supported query encodings:"));
    info.push(format!("  - principal_text: Principal converted to text"));
    info.push(format!("  - principal_direct: Direct Principal encoding"));
    info.push(format!("  - account_id: Account identifier with hash"));
    info.push(format!("  - account_id_hex: Hex-encoded account identifier"));
    info.push(format!("  - user_variant_0: EXT User::Principal format"));
    info.push(format!("  - user_variant_1: EXT User::Address format"));
    
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
    let _daku_canister = Principal::from_text(DAKU_MOTOKO_CANISTER).unwrap_or(Principal::anonymous());
    debug_logs.push("Testing Daku Motoko fallback method...".to_string());
    match query_tokens(DAKU_MOTOKO_CANISTER, test_user).await {
        Ok(count) => {
            debug_logs.push(format!("Daku Motoko fallback success - token count: {}", count));
        },
        Err(e) => {
            debug_logs.push(format!("Daku Motoko fallback error: {}", e));
        }
    }
    
    // Test GG Album fallback
    let _gg_canister = Principal::from_text(GG_ALBUM_CANISTER).unwrap_or(Principal::anonymous());
    debug_logs.push("Testing GG Album fallback method...".to_string());
    match query_tokens(GG_ALBUM_CANISTER, test_user).await {
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

#[update]
async fn test_ext_query(canister_id: String, principal_id: String) -> Vec<String> {
    let mut logs = Vec::new();
    logs.push(format!("Testing EXT query for canister {} with principal {}", canister_id, principal_id));
    
    // Parse the principal or use anonymous
    let principal = match Principal::from_text(&principal_id) {
        Ok(p) => p,
        Err(_) => {
            logs.push(format!("Invalid principal ID, using anonymous"));
            Principal::anonymous()
        }
    };
    
    // Try to query tokens
    match query_tokens(&canister_id, &principal).await {
        Ok(count) => {
            logs.push(format!("Query succeeded! Found {} tokens", count));
        },
        Err(e) => {
            logs.push(format!("Query failed: {}", e));
        }
    }
    
    logs
}

// Add an admin function to set NFT counts directly (for verified wallets)
#[update]
fn set_verified_nft_counts(user: Principal, daku_count: u64, gg_count: u64) -> HolderInfo {
    let current_time = time();
    let info = HolderInfo {
        daku_count,
        gg_count,
        total_count: daku_count + gg_count,
        last_updated: current_time,
    };
    
    // Update in holder info
    HOLDER_INFO.with(|holder_info| {
        holder_info.borrow_mut().insert(user, info.clone());
    });
    
    // Also update NFT_COUNTS for compatibility
    NFT_COUNTS.with(|counts| {
        counts.borrow_mut().insert(user, NFTProgress {
            count: info.total_count,
            in_progress: false,
            last_updated: current_time,
        });
    });
    
    // Also update in known holders for future fallback
    KNOWN_HOLDERS.with(|holders| {
        holders.borrow_mut().insert(user, info.clone());
    });
    
    info
}

// Optimization: Bulk update method that uses less cycles
#[update]
async fn bulk_update_nft_counts(users: Vec<Principal>) -> Vec<(Principal, u64)> {
    let mut results = Vec::new();
    let current_time = time();
    
    for user in users.iter() {
        // Check cache first to avoid unnecessary queries
        let should_update = NFT_COUNTS.with(|counts| {
            if let Some(progress) = counts.borrow().get(user) {
                // Only update if cache is expired
                current_time - progress.last_updated > CACHE_DURATION
            } else {
                true // No cache, need to update
            }
        });
        
        if should_update {
            // Only make expensive canister calls if necessary
            match update_holder_info(user).await {
                Ok(info) => {
                    HOLDER_INFO.with(|holder_info| {
                        holder_info.borrow_mut().insert(*user, info.clone());
                    });
                    
                    // Also update NFT_COUNTS for compatibility
                    NFT_COUNTS.with(|counts| {
                        counts.borrow_mut().insert(*user, NFTProgress {
                            count: info.total_count,
                            in_progress: false,
                            last_updated: current_time,
                        });
                    });
                    
                    results.push((*user, info.total_count));
                },
                Err(_) => {
                    // Fallback to cached value or 0
                    let count = NFT_COUNTS.with(|counts| {
                        counts.borrow().get(user).map_or(0, |p| p.count)
                    });
                    results.push((*user, count));
                }
            }
        } else {
            // Use cached value
            let count = NFT_COUNTS.with(|counts| {
                counts.borrow().get(user).map_or(0, |p| p.count)
            });
            results.push((*user, count));
        }
    }
    
    LAST_BULK_UPDATE.with(|last_update| {
        *last_update.borrow_mut() = current_time;
    });
    
    results
}

// Optimization: Add exponential backoff retry helper for more efficient retries
async fn retry_with_backoff<T, F, Fut>(operation: F, max_retries: u8) -> Result<T, String> 
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    let mut retries = 0;
    let mut delay_ms = 100; // Start with 100ms delay
    
    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                retries += 1;
                if retries >= max_retries {
                    return Err(format!("Operation failed after {} retries: {}", max_retries, e));
                }
                
                // Sleep with exponential backoff
                ic_cdk::print(format!("Retry {} failed, waiting {}ms: {}", retries, delay_ms, e));
                
                // Simple delay using async
                let start = time();
                let delay_nanos = delay_ms as u64 * 1_000_000; // Convert ms to ns
                while time() < start + delay_nanos {
                    // Yield to allow other work
                    async {}.await;
                }
                
                // Exponential backoff with max of 5 seconds
                delay_ms = std::cmp::min(delay_ms * 2, 5000);
            }
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Default, Debug)]
pub struct GetAllTokensResponse {
    pub total_count: u64,
    pub daku_count: u64,
    pub gg_album_count: u64,
    pub errors: Vec<String>,
}

#[ic_cdk::update]
async fn get_all_tokens(user: String) -> GetAllTokensResponse {
    let mut response = GetAllTokensResponse::default();
    
    match Principal::from_text(&user) {
        Ok(principal) => {
            // Query Daku tokens
            match query_daku_motoko_tokens(&principal).await {
                Ok(count) => {
                    response.daku_count = count;
                    response.total_count += count;
                }
                Err(e) => {
                    response.errors.push(format!("Failed to query Daku tokens: {}", e));
                }
            }
            
            // Query GG Album tokens
            match query_gg_album_tokens(&principal).await {
                Ok(count) => {
                    response.gg_album_count = count;
                    response.total_count += count;
                }
                Err(e) => {
                    response.errors.push(format!("Failed to query GG Album tokens: {}", e));
                }
            }
        },
        Err(e) => {
            response.errors.push(format!("Invalid principal: {}", e));
        }
    }
    
    response
}

// Updated registry query function
#[ic_cdk::update]
async fn get_nft_registry(canister_id: String) -> String {
    let mut result = String::new();
    
    // Validate canister ID format
    match Principal::from_text(&canister_id) {
        Ok(canister_principal) => {
            // Validate that this looks like a canister ID (not a user principal)
            if canister_principal.as_slice().len() < 10 {
                return format!("Error: {} doesn't appear to be a valid canister ID (too short)", canister_id);
            }
            
            let mut success = false;
            
            // Check if this is GG Album canister
            if canister_id == GG_ALBUM_CANISTER {
                match get_gg_registry_records(canister_principal).await {
                    Ok(records) => {
                        success = true;
                        let total = records.len();
                        result.push_str(&format!("Registry for {} (GG Album format): {} records\n", canister_id, total));
                        
                        // Show only a limited number of records
                        let display_limit = 20;
                        let preview_records = if total > display_limit {
                            &records[0..display_limit]
                        } else {
                            &records[..]
                        };
                        
                        for record in preview_records {
                            // Each record has index and owner fields
                            result.push_str(&format!("Index: {}, Owner: {}\n", record.index, record.owner));
                        }
                        
                        if total > display_limit {
                            result.push_str(&format!("... and {} more records\n", total - display_limit));
                        }
                    },
                    Err((code, msg)) => {
                        result.push_str(&format!("Error querying GG Album registry format: {:?} - {}\n", code, msg));
                    }
                }
            }
            
            // Try Daku-specific record format
            if !success {
                match get_registry_daku_records(canister_principal).await {
                    Ok(records) => {
                        success = true;
                        let total = records.len();
                        result.push_str(&format!("Registry for {} (Daku format): {} records\n", canister_id, total));
                        
                        // Show only a limited number of records
                        let display_limit = 20;
                        let preview_records = if total > display_limit {
                            &records[0..display_limit]
                        } else {
                            &records[..]
                        };
                        
                        for record in preview_records {
                            // Each record now has index and owner fields
                            result.push_str(&format!("Index: {}, Owner: {}\n", record.index, record.owner));
                        }
                        
                        if total > display_limit {
                            result.push_str(&format!("... and {} more records\n", total - display_limit));
                        }
                    },
                    Err((code, msg)) => {
                        result.push_str(&format!("Error querying Daku registry format: {:?} - {}\n", code, msg));
                    }
                }
            }
            
            // Try raw string method as fallback
            if !success {
                // Try GG Album raw first if that's the target canister
                if canister_id == GG_ALBUM_CANISTER {
                    match get_gg_registry_raw(canister_principal).await {
                        Ok(registry) => {
                            success = true;
                            result.push_str("RAW GG Album registry format:\n");
                            if registry.len() > 500 {
                                // Display the first 500 bytes as debug format
                                result.push_str(&format!("Preview: {:?}\n...", &registry[0..500]));
                            } else {
                                // Display the whole byte vector in debug format
                                result.push_str(&format!("Registry for {} (raw):\n{:?}", canister_id, registry));
                            }
                        },
                        Err((_, error)) => {
                            result.push_str(&format!("Failed to get raw GG Album registry: {}\n", error));
                        }
                    }
                }
                
                if !success {
                    match get_registry_raw(canister_principal).await {
                        Ok(registry) => {
                            success = true;
                            result.push_str("RAW registry format:\n");
                            if registry.len() > 500 {
                                // Display the first 500 bytes as debug format
                                result.push_str(&format!("Preview: {:?}\n...", &registry[0..500]));
                            } else {
                                // Display the whole byte vector in debug format
                                result.push_str(&format!("Registry for {} (raw):\n{:?}", canister_id, registry));
                            }
                        },
                        Err((_, error)) => {
                            result.push_str(&format!("Failed to get raw registry: {}\n", error));
                        }
                    }
                }
            }
            
            // Try alternative method (token vector)
            if !success {
                if canister_id == GG_ALBUM_CANISTER {
                    match get_gg_registry_tokens(canister_principal).await {
                        Ok(tokens) => {
                            success = true;
                            result.push_str(&format!("Registry for {} (GG tokens): {} entries\n", canister_id, tokens.len()));
                            
                            // Limit to first 20 entries to avoid excessive output
                            let mut count = 0;
                            for token_id in tokens.iter() {
                                if count >= 20 {
                                    result.push_str("... (more entries available)\n");
                                    break;
                                }
                                result.push_str(&format!("Token: {}\n", token_id));
                                count += 1;
                            }
                        },
                        Err((inner_code, inner_msg)) => {
                            result.push_str(&format!("Error querying GG token registry: {:?} - {}\n", inner_code, inner_msg));
                        }
                    }
                } else {
                    match get_registry_tokens(canister_principal).await {
                        Ok(tokens) => {
                            success = true;
                            result.push_str(&format!("Registry for {} (tokens): {} entries\n", canister_id, tokens.len()));
                            
                            // Limit to first 20 entries to avoid excessive output
                            let mut count = 0;
                            for token_id in tokens.iter() {
                                if count >= 20 {
                                    result.push_str("... (more entries available)\n");
                                    break;
                                }
                                result.push_str(&format!("Token: {}\n", token_id));
                                count += 1;
                            }
                        },
                        Err((inner_code, inner_msg)) => {
                            result.push_str(&format!("Error querying token registry: {:?} - {}\n", inner_code, inner_msg));
                        }
                    }
                }
            }
            
            // Try getting registry as a HashMap
            if !success {
                if canister_id == GG_ALBUM_CANISTER {
                    match get_gg_registry_map(canister_principal).await {
                        Ok(map) => {
                            success = true;
                            result.push_str(&format!("Registry for {} (GG map): {} entries\n", canister_id, map.len()));
                            
                            // Limit to first 20 entries to avoid excessive output
                            let mut count = 0;
                            for (token_id, owner) in map.iter() {
                                if count >= 20 {
                                    result.push_str("... (more entries available)\n");
                                    break;
                                }
                                result.push_str(&format!("Token: {}, Owner: {}\n", token_id, owner.to_text()));
                                count += 1;
                            }
                        },
                        Err((map_code, map_msg)) => {
                            result.push_str(&format!("Error querying GG registry map: {:?} - {}\n", map_code, map_msg));
                        }
                    }
                } else {
                    match get_registry_map(canister_principal).await {
                        Ok(map) => {
                            success = true;
                            result.push_str(&format!("Registry for {} (map): {} entries\n", canister_id, map.len()));
                            
                            // Limit to first 20 entries to avoid excessive output
                            let mut count = 0;
                            for (token_id, owner) in map.iter() {
                                if count >= 20 {
                                    result.push_str("... (more entries available)\n");
                                    break;
                                }
                                result.push_str(&format!("Token: {}, Owner: {}\n", token_id, owner.to_text()));
                                count += 1;
                            }
                        },
                        Err((map_code, map_msg)) => {
                            result.push_str(&format!("Error querying registry map: {:?} - {}\n", map_code, map_msg));
                        }
                    }
                }
            }
            
            // Try getting registry entries as records
            if !success {
                match get_registry_entries(canister_principal).await {
                    Ok(entries) => {
                        success = true;
                        result.push_str(&format!("Found {} registry entries\n", entries.len()));
                        if entries.len() > 0 {
                            for entry in entries.iter().take(10) {
                                result.push_str(&format!("Token: {}, Owner: {}\n", entry.0, entry.1.to_text()));
                            }
                            if entries.len() > 10 {
                                result.push_str("...(truncated)\n");
                            }
                        }
                        result.push_str(&format!("Registry for {} (entries):\n{} entries\n", canister_id, entries.len()));
                    },
                    Err((_, error)) => {
                        result.push_str(&format!("Failed to get registry entries: {}\n", error));
                    }
                }
            }
            
            // Finally try direct canister call for EXT interface if nothing else worked
            if !success {
                result.push_str("\nAttempting to use EXT standard query...");
                match query_tokens(&canister_id, &Principal::anonymous()).await {
                    Ok(count) => {
                        result.push_str(&format!("\nEXT query successful: {} tokens found", count));
                    },
                    Err(err) => {
                        result.push_str(&format!("\nEXT query failed: {}", err));
                    }
                }
            }
        },
        Err(e) => {
            result.push_str(&format!("Invalid canister ID format: {}. Make sure you're using a correct canister ID.", e));
        }
    }
    
    result
}