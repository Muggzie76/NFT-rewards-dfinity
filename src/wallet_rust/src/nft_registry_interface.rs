use candid::{CandidType, Nat, Principal, IDLValue};
use ic_cdk::api::call::RejectionCode;
use std::collections::HashMap;

// Define registry entry type - more flexible for different canister implementations
#[derive(CandidType, candid::Deserialize, Debug)]
pub struct RegistryValue {
    pub owner: Principal,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

// Define a new structure specifically for the Daku registry format based on the Candid definition
#[derive(candid::CandidType, candid::Deserialize, Debug, Clone)]
pub struct DakuRegistryRecord {
    pub index: TokenIndex,
    pub owner: AccountId,
}

// Define TokenIndex and AccountId as per Candid definition
pub type TokenIndex = u32;
pub type AccountId = String;

// Alternative representation if the above doesn't work
#[derive(CandidType, candid::Deserialize, Debug)]
pub struct DakuRecordAlt {
    #[serde(flatten)]
    pub fields: HashMap<String, String>,
}

// Get registry directly as raw bytes for fallback decoding
pub async fn get_registry_raw(canister_id: Principal) -> Result<Vec<u8>, (RejectionCode, String)> {
    ic_cdk::api::call::call_raw(canister_id, "getRegistry", &[], 0).await
}

// Primary function to get Daku registry records
pub async fn get_registry_daku_records(
    canister_id: Principal,
) -> Result<Vec<DakuRegistryRecord>, (RejectionCode, String)> {
    get_registry_daku_records_aux(canister_id).await
}

// Helper function to handle different encoding attempts
async fn get_registry_daku_records_aux(
    canister_id: Principal,
) -> Result<Vec<DakuRegistryRecord>, (RejectionCode, String)> {
    // Try the correct interface, matching exactly the Candid declared interface
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountId)>,)>(
        canister_id,
        "getRegistry",
        ()
    ).await {
        Ok((records,)) => {
            // Convert tuples to our DakuRegistryRecord struct
            let daku_records = records.into_iter()
                .map(|(index, owner)| {
                    DakuRegistryRecord {
                        index,
                        owner,
                    }
                })
                .collect();
            Ok(daku_records)
        },
        Err(err) => {
            // If this fails, try to decode the raw response
            match get_registry_raw(canister_id).await {
                Ok(bytes) => {
                    // Try to decode as the exact expected format
                    if let Ok((result,)) = candid::decode_one::<(Vec<(TokenIndex, AccountId)>,)>(&bytes) {
                        let daku_records = result.into_iter()
                            .map(|(index, owner)| {
                                DakuRegistryRecord {
                                    index,
                                    owner,
                                }
                            })
                            .collect();
                        return Ok(daku_records);
                    }
                    
                    // If all decoding attempts fail, return the original error
                    Err(err)
                },
                Err(_) => Err(err),
            }
        }
    }
}

// Alternative approach using a vector of tokens
pub async fn get_registry_tokens(
    canister_id: Principal,
) -> Result<Vec<TokenIndex>, (RejectionCode, String)> {
    // Call getRegistry with the correct interface
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountId)>,)>(
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

// Try a different approach: Query registry as HashMap<TokenIndex, Owner>
pub async fn get_registry_map(
    canister_id: Principal,
) -> Result<HashMap<TokenIndex, Principal>, (RejectionCode, String)> {
    // Call getRegistry with the correct interface
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountId)>,)>(
        canister_id,
        "getRegistry",
        ()
    ).await {
        Ok((records,)) => {
            // Convert to HashMap but note that we're interpreting the string as a principal
            // which may not be accurate - this is a best-effort conversion
            let mut map = HashMap::new();
            for (index, owner_id) in records {
                // Try to convert the owner_id to a principal
                // If this fails, we'll just skip this entry
                if let Ok(principal) = Principal::from_text(&owner_id) {
                    map.insert(index, principal);
                }
            }
            Ok(map)
        },
        Err(err) => Err(err)
    }
}

// Get registry entries as (token_id, principal) tuples
pub async fn get_registry_entries(
    canister_id: Principal,
) -> Result<Vec<(TokenIndex, Principal)>, (RejectionCode, String)> {
    // Call getRegistry with the correct interface
    match ic_cdk::api::call::call::<(), (Vec<(TokenIndex, AccountId)>,)>(
        canister_id,
        "getRegistry",
        ()
    ).await {
        Ok((records,)) => {
            // Convert to (TokenIndex, Principal) tuples, skipping any entries where
            // the owner_id can't be parsed as a Principal
            let entries: Vec<(TokenIndex, Principal)> = records.into_iter()
                .filter_map(|(index, owner_id)| {
                    match Principal::from_text(&owner_id) {
                        Ok(principal) => Some((index, principal)),
                        Err(_) => None
                    }
                })
                .collect();
            Ok(entries)
        },
        Err(err) => Err(err)
    }
}

// Get registry entries using a common NFT interface (entries as record)
#[derive(candid::CandidType, candid::Deserialize, Debug)]
pub struct TokenOwner {
    pub token_id: u64,
    pub owner: Principal,
} 