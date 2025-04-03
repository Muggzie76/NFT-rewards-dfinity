const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Define the paths to the CSV files
const ggCsvPath = path.join(__dirname, 'holders data', 'gg-album-release_holders_1743207711480.csv');
const dakuCsvPath = path.join(__dirname, 'holders data', 'daku-motoko_holders_1743207770680.csv');

// Read the CSV files
const ggCsvData = fs.readFileSync(ggCsvPath, 'utf8');
const dakuCsvData = fs.readFileSync(dakuCsvPath, 'utf8');

// Print file info
console.log(`GG Album Release CSV: ${ggCsvData.split('\n').length} lines`);
console.log(`Daku Motoko CSV: ${dakuCsvData.split('\n').length} lines`);

// Use a different approach - try the load_test_csv_data first
try {
  // Load test data first
  console.log('Loading test CSV data into wallet canister...');
  const testResult = execSync('dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai load_test_csv_data').toString();
  console.log('Test load result:', testResult);
  
  // Update all holders
  console.log('Updating all holders...');
  const updateResult = execSync('dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai update_all_holders').toString();
  console.log('Update result:', updateResult);
  
  // Get holder info
  console.log('Getting holder info...');
  const holdersResult = execSync('dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai get_total_holders').toString();
  console.log('Total holders:', holdersResult);
  
  // Trigger a payout
  console.log('Triggering payout...');
  const payoutResult = execSync('dfx canister --network ic call zeqfj-qyaaa-aaaaf-qanua-cai force_payout').toString();
  console.log('Payout result:', payoutResult);
  
  // Get the stats
  console.log('Getting stats...');
  const statsResult = execSync('dfx canister --network ic call zeqfj-qyaaa-aaaaf-qanua-cai get_stats').toString();
  console.log('Stats result:');
  console.log(statsResult);
  
} catch (error) {
  console.error('Error:', error.message);
} 