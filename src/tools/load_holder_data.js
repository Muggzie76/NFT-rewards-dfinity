const fs = require('fs');
const path = require('path');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');

// Define the canister IDs
const WALLET_CANISTER_ID = 'rce3q-iaaaa-aaaap-qpyfa-cai';
const PAYOUT_CANISTER_ID = 'zeqfj-qyaaa-aaaaf-qanua-cai';
const GG_ALBUM_CANISTER_ID = 'v6gck-vqaaa-aaaal-qi3sa-cai';
const DAKU_MOTOKO_CANISTER_ID = 'erfen-7aaaa-aaaap-ahniq-cai';

// Function to create or load identity
function getIdentity() {
  const identityPath = path.join(__dirname, 'identity.json');
  let identity;
  
  try {
    if (fs.existsSync(identityPath)) {
      // Load existing identity
      console.log('Loading existing identity...');
      const identityJson = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
      identity = Ed25519KeyIdentity.fromJSON(JSON.stringify(identityJson));
    } else {
      // Create new identity
      console.log('Creating new identity...');
      identity = Ed25519KeyIdentity.generate();
      fs.writeFileSync(identityPath, JSON.stringify(identity.toJSON()), 'utf8');
    }
    
    console.log(`Using identity with principal: ${identity.getPrincipal().toText()}`);
    return identity;
  } catch (error) {
    console.error('Error with identity:', error);
    process.exit(1);
  }
}

// Create an agent to communicate with the IC
const identity = getIdentity();
const agent = new HttpAgent({
  host: 'https://ic0.app',
  identity
});

// Perform fetch root key (only needed for local development)
// Remove this line when interacting with the IC mainnet
// agent.fetchRootKey();

// Define the interface for the wallet canister
const walletIdl = ({ IDL }) => {
  const HolderInfo = IDL.Record({
    'daku_count': IDL.Nat64,
    'gg_count': IDL.Nat64,
    'total_count': IDL.Nat64,
    'last_updated': IDL.Nat64,
  });
  return IDL.Service({
    'load_csv_data': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'update_all_holders': IDL.Func([], [IDL.Nat64], []),
    'get_all_holders': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, HolderInfo))], ['query']),
    'test_direct_canister_calls': IDL.Func([], [IDL.Vec(IDL.Text)], []),
    'test_ext_query': IDL.Func([IDL.Text, IDL.Text], [IDL.Vec(IDL.Text)], []),
    'is_using_csv_data': IDL.Func([], [IDL.Bool], ['query']),
  });
};

// Define the interface for the payout canister
const payoutIdl = ({ IDL }) => {
  return IDL.Service({
    'force_payout': IDL.Func([], [], []),
    'get_stats': IDL.Func([], [IDL.Record({
      'total_payouts': IDL.Nat64,
      'last_payout_timestamp': IDL.Nat64,
      'successful_payouts': IDL.Nat64,
      'failed_payouts': IDL.Nat64,
      'token_balance': IDL.Nat,
    })], ['query'])
  });
};

// Create the wallet and payout actors
const walletActor = Actor.createActor(walletIdl, {
  agent,
  canisterId: WALLET_CANISTER_ID,
});

const payoutActor = Actor.createActor(payoutIdl, {
  agent,
  canisterId: PAYOUT_CANISTER_ID,
});

// Get and display payout statistics
async function getPayoutStats() {
  try {
    const stats = await payoutActor.get_stats();
    console.log('\nPayout Statistics:');
    console.log(`  Token Balance: ${stats.token_balance}`);
    console.log(`  Total Payouts: ${stats.total_payouts}`);
    console.log(`  Successful Payouts: ${stats.successful_payouts}`);
    console.log(`  Failed Payouts: ${stats.failed_payouts}`);
    
    if (stats.last_payout_timestamp > 0) {
      const lastPayoutDate = new Date(Number(stats.last_payout_timestamp / 1000000n));
      console.log(`  Last Payout: ${lastPayoutDate.toISOString()}`);
    } else {
      console.log('  Last Payout: Never');
    }
  } catch (error) {
    console.error('Error fetching payout stats:', error);
  }
}

// Test direct canister connections
async function testCanisterConnections() {
  try {
    console.log('Testing direct canister connections...');
    const testResults = await walletActor.test_direct_canister_calls();
    
    console.log('\nCanister Connection Test Results:');
    testResults.forEach(line => console.log(`  ${line}`));
    
    const testPrincipal = identity.getPrincipal().toText();
    
    // Test GG Album canister specifically
    console.log('\nTesting connection to GG Album Release canister...');
    const ggTestResults = await walletActor.test_ext_query(GG_ALBUM_CANISTER_ID, testPrincipal);
    
    console.log('\nGG Album Canister Test Results:');
    ggTestResults.forEach(line => console.log(`  ${line}`));
    
    // Test Daku Motoko canister specifically
    console.log('\nTesting connection to Daku Motoko canister...');
    const dakuTestResults = await walletActor.test_ext_query(DAKU_MOTOKO_CANISTER_ID, testPrincipal);
    
    console.log('\nDaku Motoko Canister Test Results:');
    dakuTestResults.forEach(line => console.log(`  ${line}`));
    
    return true;
  } catch (error) {
    console.error('Error testing canister connections:', error);
    return false;
  }
}

// Main function to fetch data from NFT canisters and process payouts
async function fetchFromCanisters() {
  try {
    // First check if the system is using CSV data
    const isUsingCsvData = await walletActor.is_using_csv_data();
    
    if (isUsingCsvData) {
      console.log('System is currently using CSV data. Loading empty CSV data to disable CSV mode...');
      // Load empty CSV data to disable CSV mode
      await walletActor.load_csv_data("accountIdentifier,principal,tokenIds,numberOfTokens", 
                                     "accountIdentifier,principal,tokenIds,numberOfTokens");
      console.log('Empty CSV data loaded to disable CSV mode.');
    }
    
    // Test the canister connections
    await testCanisterConnections();
    
    // Update all holders from NFT canisters
    console.log('Updating all holders from NFT canisters...');
    const totalHolders = await walletActor.update_all_holders();
    
    console.log(`All holders updated. Total holders: ${totalHolders}`);
    
    // Get initial payout stats
    console.log('Getting current payout stats...');
    await getPayoutStats();
    
    console.log('Triggering payout...');
    await payoutActor.force_payout();
    
    console.log('Payout successfully triggered!');
    
    // Get updated payout stats
    console.log('Getting updated payout stats...');
    await getPayoutStats();
    
    // Get current holders
    console.log('Getting current holders...');
    const holders = await walletActor.get_all_holders();
    console.log(`Retrieved ${holders.length} holders from the wallet canister.`);
    
    // Print some holder stats
    if (holders.length > 0) {
      console.log('\nSample holder data:');
      for (let i = 0; i < Math.min(5, holders.length); i++) {
        const [principal, info] = holders[i];
        console.log(`Principal: ${principal.toText()}`);
        console.log(`  Daku count: ${info.daku_count}`);
        console.log(`  GG count: ${info.gg_count}`);
        console.log(`  Total count: ${info.total_count}`);
        console.log(`  Last updated: ${new Date(Number(info.last_updated / 1000000n)).toISOString()}`);
        console.log('---');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
fetchFromCanisters().then(() => console.log('Done!')); 