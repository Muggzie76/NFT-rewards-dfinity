use candid::{CandidType, Nat, Principal};
use ic_cdk::api::call::RejectionCode;

#[derive(CandidType, candid::Deserialize, Debug)]
pub struct TokenInfo {
    pub index: Nat,
    pub canister: Principal,
}

// Use a simpler approach to query Daku tokens
pub async fn get_tokens_for_user(canister_id: Principal, user: Principal) -> Result<Vec<Principal>, (RejectionCode, String)> {
    // Convert the user principal to text format for compatibility
    let user_text = user.to_text();
    
    // Call using text format
    let result: Result<(Vec<Principal>,), _> = ic_cdk::api::call::call(
        canister_id,
        "tokens",
        (user_text,)
    ).await;
    
    result.map(|(tokens,)| tokens)
} 