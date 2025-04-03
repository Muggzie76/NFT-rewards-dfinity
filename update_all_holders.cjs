const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Define the paths to the CSV files in the data directory (which contain more holders)
const ggCsvPath = path.join(__dirname, 'data', 'gg-album-release_holders_1742878297330.csv');
const dakuCsvPath = path.join(__dirname, 'data', 'daku-motoko_holders_1742878395968.csv');

// Read the CSV files
const ggCsvData = fs.readFileSync(ggCsvPath, 'utf8');
const dakuCsvData = fs.readFileSync(dakuCsvPath, 'utf8');

// Parse CSV data
function parseCSV(csvData) {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i] || !lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const obj = {};
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j];
    }
    
    result.push(obj);
  }
  
  return result;
}

// Parse both CSVs
const ggHolders = parseCSV(ggCsvData);
const dakuHolders = parseCSV(dakuCsvData);

console.log(`GG Album Release parsed: ${ggHolders.length} holders`);
console.log(`Daku Motoko parsed: ${dakuHolders.length} holders`);

// Combine and deduplicate holders
const holderMap = new Map();

ggHolders.forEach(holder => {
  if (!holder.principal) return;
  
  holderMap.set(holder.principal, {
    principal: holder.principal,
    ggCount: parseInt(holder.numberOfTokens) || 0,
    dakuCount: 0
  });
});

dakuHolders.forEach(holder => {
  if (!holder.principal) return;
  
  if (holderMap.has(holder.principal)) {
    // Update existing holder
    const existingHolder = holderMap.get(holder.principal);
    existingHolder.dakuCount = parseInt(holder.numberOfTokens) || 0;
  } else {
    // Add new holder
    holderMap.set(holder.principal, {
      principal: holder.principal,
      ggCount: 0,
      dakuCount: parseInt(holder.numberOfTokens) || 0
    });
  }
});

// Convert to array
const holders = Array.from(holderMap.values());
console.log(`Combined unique holders: ${holders.length}`);

// Print preview of holders
console.log('First 5 holders:');
for (let i = 0; i < Math.min(5, holders.length); i++) {
  console.log(`  ${holders[i].principal}: GG=${holders[i].ggCount}, Daku=${holders[i].dakuCount}`);
}

// Function to update holders in batches
async function updateHolders() {
  console.log('Beginning holder updates...');
  let successCount = 0;
  
  for (const holder of holders) {
    try {
      const command = `dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai set_verified_nft_counts '(principal "${holder.principal}", ${holder.dakuCount}, ${holder.ggCount})'`;
      const result = execSync(command).toString().trim();
      successCount++;
      
      // Print progress every 10 holders
      if (successCount % 10 === 0 || successCount === holders.length) {
        console.log(`Updated ${successCount}/${holders.length} holders`);
      }
    } catch (error) {
      console.error(`Error updating holder ${holder.principal}:`, error.message);
    }
  }
  
  console.log(`Holder update complete. Successfully updated ${successCount}/${holders.length} holders.`);
  
  // Get total holders from canister
  try {
    console.log('Getting total holders from canister...');
    const totalHolders = execSync('dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai get_total_holders').toString().trim();
    console.log('Total holders in canister:', totalHolders);
    
    // Trigger payout
    console.log('Triggering payout...');
    const payoutResult = execSync('dfx canister --network ic call zeqfj-qyaaa-aaaaf-qanua-cai force_payout').toString();
    console.log('Payout triggered:', payoutResult);
    
    // Get stats
    console.log('Getting payout stats...');
    const statsResult = execSync('dfx canister --network ic call zeqfj-qyaaa-aaaaf-qanua-cai get_stats').toString();
    console.log('Payout stats:');
    console.log(statsResult);
    
  } catch (error) {
    console.error('Error in final operations:', error.message);
  }
}

// Run the update process
updateHolders(); 