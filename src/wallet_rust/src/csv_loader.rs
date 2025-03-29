use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ic_cdk::api::time;

#[derive(CandidType, Serialize, Deserialize, Clone, Default, Debug)]
pub struct HolderInfo {
    pub daku_count: u64,
    pub gg_count: u64,
    pub total_count: u64,
    pub last_updated: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct CSVHolderEntry {
    pub account_identifier: String,
    pub principal: Option<String>,
    pub token_ids: String,
    pub number_of_tokens: u64,
}

// Function to load Daku Motoko holders
pub fn load_daku_holders(csv_data: &str) -> HashMap<Principal, u64> {
    let mut holders = HashMap::new();
    
    // Skip header
    let lines = csv_data.split('\n').skip(1);
    
    for line in lines {
        if line.trim().is_empty() {
            continue;
        }
        
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 4 {
            ic_cdk::print(format!("Invalid CSV line: {}", line));
            continue;
        }
        
        // Extract principal
        let principal_str = parts[1].trim();
        if principal_str.is_empty() {
            continue; // Skip entries with no principal
        }
        
        // Parse principal
        match Principal::from_text(principal_str) {
            Ok(principal) => {
                // Extract number of tokens
                if let Ok(num_tokens) = parts[3].trim().parse::<u64>() {
                    *holders.entry(principal).or_insert(0) += num_tokens;
                }
            },
            Err(e) => {
                ic_cdk::print(format!("Invalid principal {}: {}", principal_str, e));
            }
        }
    }
    
    holders
}

// Function to load GG Album Release holders
pub fn load_gg_holders(csv_data: &str) -> HashMap<Principal, u64> {
    let mut holders = HashMap::new();
    
    // Skip header
    let lines = csv_data.split('\n').skip(1);
    
    for line in lines {
        if line.trim().is_empty() {
            continue;
        }
        
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 4 {
            ic_cdk::print(format!("Invalid CSV line: {}", line));
            continue;
        }
        
        // Extract principal
        let principal_str = parts[1].trim();
        if principal_str.is_empty() {
            continue; // Skip entries with no principal
        }
        
        // Parse principal
        match Principal::from_text(principal_str) {
            Ok(principal) => {
                // Extract number of tokens
                if let Ok(num_tokens) = parts[3].trim().parse::<u64>() {
                    *holders.entry(principal).or_insert(0) += num_tokens;
                }
            },
            Err(e) => {
                ic_cdk::print(format!("Invalid principal {}: {}", principal_str, e));
            }
        }
    }
    
    holders
}

// Function to load both CSV files and merge the data
pub fn load_all_holders(daku_csv: &str, gg_csv: &str) -> HashMap<Principal, HolderInfo> {
    let daku_holders = load_daku_holders(daku_csv);
    let gg_holders = load_gg_holders(gg_csv);
    
    let mut combined_holders = HashMap::new();
    let current_time = time();
    
    // Process Daku holders
    for (principal, count) in daku_holders {
        let info = combined_holders.entry(principal).or_insert(HolderInfo {
            daku_count: 0,
            gg_count: 0,
            total_count: 0,
            last_updated: current_time,
        });
        
        info.daku_count = count;
        info.total_count += count;
    }
    
    // Process GG holders
    for (principal, count) in gg_holders {
        let info = combined_holders.entry(principal).or_insert(HolderInfo {
            daku_count: 0,
            gg_count: 0,
            total_count: 0,
            last_updated: current_time,
        });
        
        info.gg_count = count;
        info.total_count += count;
    }
    
    combined_holders
}

// Test function to generate CSV sample for testing
pub fn generate_test_csv_data() -> (String, String) {
    let daku_csv = "accountIdentifier,principal,tokenIds,numberOfTokens
eba62ff09790de35107a9502cf673a708f5ce4aa9ad04d0e862349c9d25935f8,cd3yv-nkb2m-mjvnb-naicp-mkqk2-g4f3d-g7y4g-xdeaz-n6i75-xur54-xae,2333,3
f44c18611325ddf715e8a8a6f8e8308f2606b2ebc5ca5102f8a4f97981128450,wxnnz-bart4-tsufm-hvz3u-fhcgm-vb5yu-ilba5-7qaui-25eg5-nsmbg-zqe,4;7;9;1962;10;92,0
b1569a59eea517235679a67be1d1df9b5a6c700656b56116e71f8e14b3f2a585,jt6pq-pfact-6nq4w-xpd7l-jvsh3-ghmvo-yp34h-pmon5-5dcjo-rygay-sqe,98;83;101;102;167;169,100";

    let gg_csv = "accountIdentifier,principal,tokenIds,numberOfTokens
eba62ff09790de35107a9502cf673a708f5ce4aa9ad04d0e862349c9d25935f8,cd3yv-nkb2m-mjvnb-naicp-mkqk2-g4f3d-g7y4g-xdeaz-n6i75-xur54-xae,2333,2
f44c18611325ddf715e8a8a6f8e8308f2606b2ebc5ca5102f8a4f97981128450,wxnnz-bart4-tsufm-hvz3u-fhcgm-vb5yu-ilba5-7qaui-25eg5-nsmbg-zqe,4;7;9;1962;10;92,7
61a14b047702783700379608d2a86248eb30721709ce3b807ec5a8571f7fc390,rce3q-iaaaa-aaaap-qpyfa-cai,2434,1";

    (daku_csv.to_string(), gg_csv.to_string())
} 