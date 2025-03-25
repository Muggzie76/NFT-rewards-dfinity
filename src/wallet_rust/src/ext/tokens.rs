use candid::{CandidType, Principal, Deserialize, Nat};
use std::collections::HashMap;
use sha2::{Digest, Sha224};
use num_traits::cast::ToPrimitive;

/// AccountIdentifier is a 28-byte array.
/// The first 4 bytes is a big-endian encoding of a CRC32 checksum of the last 24 bytes.
#[derive(CandidType, Clone, Debug)]
pub struct AccountIdentifier {
    pub hash: Vec<u8>,
}

// Standard EXT types
#[derive(CandidType, Deserialize, Debug)]
pub enum TokensResult {
    #[serde(rename = "ok")]
    Ok(Vec<u64>), // Token indices
    #[serde(rename = "err")]
    Err(TokensError),
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TokensError {
    #[serde(rename = "InvalidToken")]
    pub invalid_token: Option<String>,
    #[serde(rename = "Other")]
    pub other: Option<String>,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum User {
    #[serde(rename = "address")]
    Address(String), // textual representation of an AccountIdentifier
    #[serde(rename = "principal")]
    Principal(Principal),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum Balance {
    #[serde(rename = "ok")]
    Ok(Nat),
    #[serde(rename = "err")]
    Err(CommonError),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum CommonError {
    #[serde(rename = "InvalidToken")]
    InvalidToken(String),
    #[serde(rename = "Other")]
    Other(String),
}

// Convert Principal to Account Identifier as expected by EXT standard
pub fn principal_to_account_id(principal: &Principal, subaccount: Option<Vec<u8>>) -> Vec<u8> {
    let mut hasher = Sha224::new();
    
    // Start with \x0Aaccount-id
    hasher.update(b"\x0Aaccount-id");
    
    // Add principal
    let principal_bytes = principal.as_slice();
    hasher.update([principal_bytes.len() as u8]);
    hasher.update(principal_bytes);
    
    // Add subaccount (0 for default) - must be 32 bytes
    let subaccount_bytes = subaccount.unwrap_or(vec![0; 32]);
    hasher.update(subaccount_bytes);
    
    // Return the hash
    hasher.finalize().to_vec()
}

// Convert Principal to EXT User format - try both Address and Principal formats
pub fn principal_to_user_variants(principal: &Principal) -> Vec<User> {
    vec![
        // Try with Principal format
        User::Principal(*principal),
        
        // Try with Address format (textual AccountIdentifier)
        User::Address(hex::encode(principal_to_account_id(principal, None))),
    ]
}

// Create multiple argument encodings for the various canister formats
pub fn create_tokens_query_encodings(principal: &Principal) -> HashMap<String, Vec<u8>> {
    let mut encodings = HashMap::new();
    
    // Try principal text format (some NFT canisters expect this)
    if let Ok(encoded) = candid::encode_one(principal.to_text()) {
        encodings.insert("principal_text".to_string(), encoded);
    }
    
    // Try principal directly
    if let Ok(encoded) = candid::encode_one(principal) {
        encodings.insert("principal_direct".to_string(), encoded);
    }
    
    // Try with AccountIdentifier hash format (common in EXT)
    let account_id_hash = principal_to_account_id(principal, None);
    let account_id = AccountIdentifier { hash: account_id_hash.clone() };
    
    if let Ok(encoded) = candid::encode_one(account_id) {
        encodings.insert("account_id".to_string(), encoded);
    }
    
    // Try with hex-encoded account ID (some implementations expect this)
    if let Ok(encoded) = candid::encode_one(hex::encode(account_id_hash)) {
        encodings.insert("account_id_hex".to_string(), encoded);
    }
    
    // Try User variants
    for (i, user) in principal_to_user_variants(principal).into_iter().enumerate() {
        if let Ok(encoded) = candid::encode_one(user) {
            encodings.insert(format!("user_variant_{}", i), encoded);
        }
    }
    
    encodings
}

// Helper to decode a tokens response with multiple possible formats
pub fn decode_tokens_response(bytes: &[u8]) -> Result<u64, String> {
    // Try to decode as TokensResult (most standard)
    if let Ok(TokensResult::Ok(tokens)) = candid::decode_one::<TokensResult>(bytes) {
        return Ok(tokens.len() as u64);
    }
    
    // Try to decode as direct Vec<u64> (some implementations)
    if let Ok(tokens) = candid::decode_one::<Vec<u64>>(bytes) {
        return Ok(tokens.len() as u64);
    }
    
    // Try to decode TokensResult::Err and check for "no tokens" message
    if let Ok(TokensResult::Err(err)) = candid::decode_one::<TokensResult>(bytes) {
        if let Some(msg) = err.other {
            // Sometimes an empty collection is represented as an error with "no tokens" message
            if msg.to_lowercase().contains("no tokens") {
                return Ok(0);
            }
            return Err(format!("Error response: {}", msg));
        }
        
        if let Some(token_err) = err.invalid_token {
            return Err(format!("Invalid token: {}", token_err));
        }
        
        return Err("Unknown error in TokensResult".to_string());
    }
    
    // Try Balance response (some canisters might use this format)
    if let Ok(Balance::Ok(balance)) = candid::decode_one::<Balance>(bytes) {
        // Convert Nat to u64 if possible (handling potential overflow)
        if let Some(value) = balance.0.to_u64() {
            return Ok(value);
        }
    }
    
    Err("Failed to decode response in any expected format".to_string())
}

// Log structure for debugging query attempts
#[derive(Debug, Clone)]
pub struct QueryLog {
    pub canister_id: String,
    pub encoding_type: String, 
    pub success: bool,
    pub result: String,
}

pub fn format_query_logs(logs: Vec<QueryLog>) -> Vec<String> {
    let mut result = Vec::new();
    
    for log in logs {
        let status = if log.success { "✅" } else { "❌" };
        result.push(format!("{} Query to {}: [{}] - {}", 
                          status, log.canister_id, log.encoding_type, log.result));
    }
    
    result
}
