use candid::{CandidType, Nat, Principal};
use ic_cdk::api::call::RejectionCode;
use std::collections::HashMap;

// Define GG Album registry types from the provided Candid definitions
pub type TokenIndex = u32;
pub type AccountIdentifier1 = String;

// Define a new structure for the GG registry format based on the Candid definition
#[derive(candid::CandidType, candid::Deserialize, Debug, Clone)]
pub struct GGRegistryRecord {
    pub index: TokenIndex,
    pub owner: AccountIdentifier1,
}

// Get registry directly as raw bytes for fallback decoding
pub async fn get_gg_registry_raw(canister_id: Principal) -> Result<Vec<u8>, (RejectionCode, String)> {
    ic_cdk::api::call::call_raw(canister_id, "getRegistry", &[], 0).await
}

// Primary function to get GG registry records
pub async fn get_gg_registry_records(
    canister_id: Principal,
) -> Result<Vec<GGRegistryRecord>, (RejectionCode, String)> {
    // Based on the provided Candid definition, getRegistry returns Vec<(TokenIndex, AccountIdentifier1)>
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountIdentifier1)>,)>(
        canister_id,
        "getRegistry",
        ()
    ).await {
        Ok((records,)) => {
            // Convert tuples to our GGRegistryRecord struct
            let gg_records = records.into_iter()
                .map(|(index, owner)| {
                    GGRegistryRecord {
                        index,
                        owner,
                    }
                })
                .collect();
            Ok(gg_records)
        },
        Err(err) => {
            // If this fails, try to decode the raw response
            match get_gg_registry_raw(canister_id).await {
                Ok(bytes) => {
                    // Try to decode as the exact expected format
                    if let Ok((result,)) = candid::decode_one::<(Vec<(TokenIndex, AccountIdentifier1)>,)>(&bytes) {
                        let gg_records = result.into_iter()
                            .map(|(index, owner)| {
                                GGRegistryRecord {
                                    index,
                                    owner,
                                }
                            })
                            .collect();
                        return Ok(gg_records);
                    }
                    
                    // If all decoding attempts fail, return the original error
                    Err(err)
                },
                Err(_) => Err(err),
            }
        }
    }
}

// Get registry entries as TokenIndex only
pub async fn get_gg_registry_tokens(
    canister_id: Principal,
) -> Result<Vec<TokenIndex>, (RejectionCode, String)> {
    // Call getRegistry with the correct interface
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountIdentifier1)>,)>(
        canister_id,
        "getRegistry",
        ()
    ).await {
        Ok((records,)) => {
            // Extract only the token indices
            let tokens = records.into_iter()
                .map(|(index, _)| index)
                .collect();
            Ok(tokens)
        },
        Err(err) => Err(err)
    }
}

// Get registry entries as a map of TokenIndex -> Principal
pub async fn get_gg_registry_map(
    canister_id: Principal,
) -> Result<HashMap<TokenIndex, Principal>, (RejectionCode, String)> {
    // Call getRegistry with the correct interface
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountIdentifier1)>,)>(
        canister_id,
        "getRegistry",
        ()
    ).await {
        Ok((records,)) => {
            // Convert to HashMap, trying to interpret AccountIdentifier1 as Principal
            let mut map = HashMap::new();
            for (index, owner_id) in records {
                // Try to convert the owner_id to a principal
                if let Ok(principal) = Principal::from_text(&owner_id) {
                    map.insert(index, principal);
                }
            }
            Ok(map)
        },
        Err(err) => Err(err)
    }
}

// Get tokens owned by a specific principal
pub async fn get_gg_tokens_for_owner(
    canister_id: Principal,
    owner: Principal
) -> Result<Vec<TokenIndex>, (RejectionCode, String)> {
    // Get all registry entries
    match get_gg_registry_records(canister_id).await {
        Ok(records) => {
            // Check if the owner matches either directly or through account identifier
            let owner_text = owner.to_text();
            let tokens: Vec<TokenIndex> = records.into_iter()
                .filter(|record| {
                    // Match either the exact principal text or attempt to convert from AccountIdentifier
                    record.owner == owner_text
                })
                .map(|record| record.index)
                .collect();
            
            Ok(tokens)
        },
        Err(err) => Err(err)
    }
} 