#!/usr/bin/env npx tsx
/**
 * Full Escrow Flow Test
 *
 * Tests the complete agent-to-agent knowledge exchange:
 * 1. Seller creates offering (creates escrow on-chain)
 * 2. Buyer discovers offering
 * 3. Buyer funds escrow
 * 4. Seller releases key
 * 5. Seller claims payment
 *
 * Run with local Anvil:
 *   anvil &
 *   forge script script/DataEscrow.s.sol --broadcast --rpc-url http://127.0.0.1:8545
 *   npx tsx demo/full-escrow-test.ts --local
 *
 * Run with Sepolia (requires funded wallets):
 *   npx tsx demo/full-escrow-test.ts
 */

import { JsonRpcProvider, Wallet, formatEther } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

// Check if running local
const isLocal = process.argv.includes('--local');

// Configure environment
if (isLocal) {
  process.env.SEPOLIA_RPC_URL = process.env.LOCAL_RPC_URL;
  process.env.DATA_ESCROW_ADDRESS = process.env.LOCAL_DATA_ESCROW_ADDRESS;
}

// Set knowledge store path for test
process.env.KNOWLEDGE_STORE_PATH = path.join(__dirname, '.test-knowledge.json');

async function main() {
  console.log('='.repeat(60));
  console.log('FULL ESCROW FLOW TEST');
  console.log('='.repeat(60));
  console.log('');
  console.log('Mode:', isLocal ? 'LOCAL (Anvil)' : 'SEPOLIA');
  console.log('RPC:', process.env.SEPOLIA_RPC_URL);
  console.log('Contract:', process.env.DATA_ESCROW_ADDRESS);
  console.log('');

  // Check balances first
  const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const sellerWallet = new Wallet(process.env.SELLER_PRIVATE_KEY!, provider);
  const buyerWallet = new Wallet(process.env.BUYER_PRIVATE_KEY!, provider);

  const sellerBalance = await provider.getBalance(sellerWallet.address);
  const buyerBalance = await provider.getBalance(buyerWallet.address);

  console.log('Seller:', sellerWallet.address);
  console.log('Balance:', formatEther(sellerBalance), 'ETH');
  console.log('');
  console.log('Buyer:', buyerWallet.address);
  console.log('Balance:', formatEther(buyerBalance), 'ETH');
  console.log('');

  if (buyerBalance === 0n) {
    console.error('ERROR: Buyer has no funds. Cannot test escrow flow.');
    console.log('');
    console.log('For Sepolia, get test ETH from a faucet:');
    console.log('  https://sepoliafaucet.com/');
    console.log('  https://www.alchemy.com/faucets/ethereum-sepolia');
    console.log('');
    console.log('For local Anvil testing:');
    console.log('  anvil &');
    console.log('  forge script script/DataEscrow.s.sol --broadcast --rpc-url http://127.0.0.1:8545');
    console.log('  npx tsx demo/full-escrow-test.ts --local');
    return;
  }

  // Import knowledge tools
  const { handleKnowledgeTool } = await import('../src/tools/knowledge.js');

  // Clean up old test data
  const testStorePath = process.env.KNOWLEDGE_STORE_PATH!;
  if (fs.existsSync(testStorePath)) {
    fs.unlinkSync(testStorePath);
  }

  console.log('-'.repeat(60));
  console.log('STEP 1: Seller creates offering');
  console.log('-'.repeat(60));

  const createResult = await handleKnowledgeTool('knowledge_create_offering', {
    title: 'Test Knowledge Package',
    description: 'Strategic insights for testing',
    price_eth: '0.001',
    content: JSON.stringify({
      secret: 'The answer is 42',
      timestamp: new Date().toISOString(),
    }),
    tags: ['test', 'demo'],
  });

  const createData = JSON.parse(createResult.content[0].text);
  console.log(JSON.stringify(createData, null, 2));
  console.log('');

  if (!createData.escrowId) {
    console.error('ERROR: No escrowId returned. Contract interaction failed.');
    return;
  }

  const offeringId = createData.offering.id;
  const escrowId = createData.escrowId;
  console.log('Offering ID:', offeringId);
  console.log('Escrow ID:', escrowId);
  console.log('TX Hash:', createData.txHash);
  console.log('');

  console.log('-'.repeat(60));
  console.log('STEP 2: Buyer discovers offering');
  console.log('-'.repeat(60));

  // Start discovery API for testing
  const { createDiscoveryAPI } = await import('../src/tools/knowledge.js');
  const server = createDiscoveryAPI();
  await new Promise(r => setTimeout(r, 1000)); // Wait for server to start

  const discoverResult = await handleKnowledgeTool('knowledge_discover', {
    endpoint: `http://localhost:${process.env.DISCOVERY_PORT || 3001}`,
  });

  const discoverData = JSON.parse(discoverResult.content[0].text);
  console.log('Found', discoverData.count, 'offerings');
  console.log('');

  console.log('-'.repeat(60));
  console.log('STEP 3: Buyer funds escrow');
  console.log('-'.repeat(60));

  const requestResult = await handleKnowledgeTool('knowledge_request', {
    endpoint: `http://localhost:${process.env.DISCOVERY_PORT || 3001}`,
    offering_id: offeringId,
  });

  const requestData = JSON.parse(requestResult.content[0].text);
  console.log(JSON.stringify(requestData, null, 2));
  console.log('');

  if (!requestData.txHash) {
    console.error('ERROR: Funding failed');
    server.close();
    return;
  }

  console.log('-'.repeat(60));
  console.log('STEP 4: Seller releases key');
  console.log('-'.repeat(60));

  const releaseResult = await handleKnowledgeTool('knowledge_release_key', {
    offering_id: offeringId,
  });

  const releaseData = JSON.parse(releaseResult.content[0].text);
  console.log(JSON.stringify(releaseData, null, 2));
  console.log('');

  console.log('-'.repeat(60));
  console.log('STEP 5: Seller claims payment');
  console.log('-'.repeat(60));

  const claimResult = await handleKnowledgeTool('knowledge_claim_payment', {
    escrow_id: escrowId,
  });

  const claimData = JSON.parse(claimResult.content[0].text);
  console.log(JSON.stringify(claimData, null, 2));
  console.log('');

  // Check final balances
  const finalSellerBalance = await provider.getBalance(sellerWallet.address);
  const finalBuyerBalance = await provider.getBalance(buyerWallet.address);

  console.log('='.repeat(60));
  console.log('FINAL BALANCES');
  console.log('='.repeat(60));
  console.log('Seller:', formatEther(finalSellerBalance), 'ETH (was', formatEther(sellerBalance), ')');
  console.log('Buyer:', formatEther(finalBuyerBalance), 'ETH (was', formatEther(buyerBalance), ')');
  console.log('');
  console.log('SUCCESS! Full escrow flow completed.');

  server.close();
}

main().catch(console.error);
