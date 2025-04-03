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

// Create temporary files with escaped content
const ggTempPath = path.join(__dirname, 'gg_temp.txt');
const dakuTempPath = path.join(__dirname, 'daku_temp.txt');

fs.writeFileSync(ggTempPath, JSON.stringify(ggCsvData));
fs.writeFileSync(dakuTempPath, JSON.stringify(dakuCsvData));

console.log('Temporary files created. Uploading to wallet canister...');

try {
  // Upload the CSV data to the wallet canister
  const ggContent = fs.readFileSync(ggTempPath, 'utf8');
  const dakuContent = fs.readFileSync(dakuTempPath, 'utf8');
  
  const uploadCommand = `dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai load_csv_data ${ggContent} ${dakuContent}`;
  
  console.log('Executing upload command...');
  const uploadResult = execSync(uploadCommand).toString();
  console.log('Upload result:', uploadResult);
  
  // Update all holders
  console.log('Updating all holders...');
  const updateResult = execSync('dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai update_all_holders').toString();
  console.log('Update result:', updateResult);
  
  // Trigger a payout
  console.log('Triggering payout...');
  const payoutResult = execSync('dfx canister --network ic call zeqfj-qyaaa-aaaaf-qanua-cai force_payout').toString();
  console.log('Payout result:', payoutResult);
  
  // Get the stats
  console.log('Getting stats...');
  const statsResult = execSync('dfx canister --network ic call zeqfj-qyaaa-aaaaf-qanua-cai get_stats | head -n 30').toString();
  console.log('Stats result:');
  console.log(statsResult);
  
  // Get holder info
  console.log('Getting holder info...');
  const holdersResult = execSync('dfx canister --network ic call rce3q-iaaaa-aaaap-qpyfa-cai get_total_holders').toString();
  console.log('Total holders:', holdersResult);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  // Clean up temporary files
  fs.unlinkSync(ggTempPath);
  fs.unlinkSync(dakuTempPath);
  console.log('Temporary files cleaned up.');
} 