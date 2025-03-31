const fs = require('fs');
const path = require('path');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');

// Configuration
const canisterId = 'zksib-liaaa-aaaaf-qanva-cai';
const sourceDir = path.resolve(__dirname);

// Initialize HTTP agent for IC mainnet
const agent = new HttpAgent({
  host: 'https://ic0.app',
  identity: process.env.DFX_IDENTITY,
});

// Asset canister interface
const assetCanisterIDL = ({ IDL }) => {
  const HeaderField = IDL.Tuple(IDL.Text, IDL.Text);
  const StreamingCallbackToken = IDL.Record({
    'key': IDL.Text,
    'sha256': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'index': IDL.Nat,
    'content_encoding': IDL.Text,
  });
  const StreamingCallbackHttpResponse = IDL.Record({
    'token': IDL.Opt(StreamingCallbackToken),
    'body': IDL.Vec(IDL.Nat8),
  });
  const StreamingStrategy = IDL.Variant({
    'Callback': IDL.Record({
      'token': StreamingCallbackToken,
      'callback': IDL.Func(
        [StreamingCallbackToken],
        [StreamingCallbackHttpResponse],
        ['query'],
      ),
    }),
  });
  const HttpRequest = IDL.Record({
    'url': IDL.Text,
    'method': IDL.Text,
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(HeaderField),
  });
  const HttpResponse = IDL.Record({
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(HeaderField),
    'streaming_strategy': IDL.Opt(StreamingStrategy),
    'status_code': IDL.Nat16,
  });
  
  return IDL.Service({
    'http_request': IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'store': IDL.Func(
      [IDL.Record({
        key: IDL.Text,
        content_type: IDL.Text,
        content_encoding: IDL.Text,
        content: IDL.Vec(IDL.Nat8),
      })],
      [],
      [],
    ),
    'create_batch': IDL.Func([], [IDL.Nat], []),
    'create_chunk': IDL.Func(
      [IDL.Record({
        batch_id: IDL.Nat,
        content: IDL.Vec(IDL.Nat8),
      })],
      [IDL.Nat],
      [],
    ),
    'commit_batch': IDL.Func(
      [IDL.Record({
        batch_id: IDL.Nat,
        operations: IDL.Vec(
          IDL.Record({
            operation: IDL.Variant({
              CreateAsset: IDL.Record({
                key: IDL.Text,
                content_type: IDL.Text,
              }),
              SetAssetContent: IDL.Record({
                key: IDL.Text,
                sha256: IDL.Opt(IDL.Vec(IDL.Nat8)),
                chunk_ids: IDL.Vec(IDL.Nat),
                content_encoding: IDL.Text,
              }),
              DeleteAsset: IDL.Record({ key: IDL.Text }),
              Clear: IDL.Record({}),
              SetAssetProperties: IDL.Record({
                key: IDL.Text,
                headers: IDL.Opt(IDL.Vec(HeaderField)),
                is_aliased: IDL.Opt(IDL.Bool),
                allow_raw_access: IDL.Opt(IDL.Bool),
                max_age: IDL.Opt(IDL.Nat64),
              }),
            }),
          })
        ),
      })],
      [],
      [],
    ),
    'clear': IDL.Func([], [], []),
  });
};

// Create the actor
const actor = Actor.createActor(assetCanisterIDL, {
  agent,
  canisterId,
});

// Utility to get content type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.map': 'application/json',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Get all files in directory recursively
function getAllFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip node_modules and hidden files/directories
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'deploy.sh' || entry.name === 'upload.js') {
      continue;
    }
    
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Upload a single file directly
async function uploadFile(filePath) {
  const fileContent = fs.readFileSync(filePath);
  const relativePath = path.relative(sourceDir, filePath);
  const assetKey = '/' + relativePath.split(path.sep).join('/');
  
  console.log(`Uploading ${assetKey} (${fileContent.length} bytes)...`);
  
  try {
    await actor.store({
      key: assetKey,
      content_type: getContentType(filePath),
      content_encoding: 'identity',
      content: [...new Uint8Array(fileContent)],
    });
    console.log(`✅ Successfully uploaded ${assetKey}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${assetKey}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  // Check command-line arguments
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  if (shouldClear) {
    console.log('Clearing all existing assets...');
    try {
      await actor.clear();
      console.log('✅ Successfully cleared all assets');
    } catch (error) {
      console.error(`❌ Failed to clear assets: ${error.message}`);
    }
  }
  
  // Get all files to upload
  const files = getAllFiles(sourceDir);
  console.log(`Found ${files.length} files to upload`);
  
  // Track success/failure
  let successCount = 0;
  let failureCount = 0;
  
  // Upload files one by one
  for (const file of files) {
    const success = await uploadFile(file);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  console.log('\nUpload Summary:');
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed to upload: ${failureCount} files`);
  
  if (successCount > 0) {
    console.log('\nAccess your site at:');
    console.log(`https://${canisterId}.icp0.io/`);
    console.log(`https://${canisterId}.ic0.app/`);
  }
}

// Run the main function
main().catch(console.error); 