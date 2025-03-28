use candid::{CandidType, Nat, Principal};
use ic_cdk::api::call::RejectionCode;

// Query tokens for a specific user from the GG Album canister
pub async fn get_album_tokens_for_user(canister_id: Principal, user: Principal) -> Result<Vec<(Nat, Principal)>, (RejectionCode, String)> {
    // Convert the user principal to text format for compatibility
    let user_text = user.to_text();
    
    // Call using text format
    let result: Result<(Vec<(Nat, Principal)>,), _> = ic_cdk::api::call::call(
        canister_id,
        "tokens",
        (user_text,)
    ).await;
    
    result.map(|(tokens,)| tokens)
} 