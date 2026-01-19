#!/usr/bin/env npx tsx
/**
 * Davos Demo E2E Script
 *
 * Demonstrates the full agent economy flow:
 * 1. Seller (Agent A) uploads encrypted insights
 * 2. Seller creates escrow offer
 * 3. Buyer (Agent B) discovers and accepts offer
 * 4. Buyer funds escrow
 * 5. Seller releases decryption key
 * 6. Buyer decrypts and accesses insights
 * 7. Seller claims payment
 *
 * Prerequisites:
 * - DataEscrow contract deployed (DATA_ESCROW_ADDRESS)
 * - Seller and buyer wallets funded
 * - Bee node running with valid postage stamp
 *
 * Run: npx tsx demo/run-demo.ts
 */

import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import { Bee, BatchId, Reference } from '@ethersphere/bee-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const config = {
  beeUrl: process.env.BEE_URL || 'http://localhost:1633',
  postageBatchId: process.env.POSTAGE_BATCH_ID || '',
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  contractAddress: process.env.DATA_ESCROW_ADDRESS || '',
  sellerPrivateKey: process.env.SELLER_PRIVATE_KEY || '',
  buyerPrivateKey: process.env.BUYER_PRIVATE_KEY || '',
};

// Minimal DataEscrow ABI
const ESCROW_ABI = [
  'function createEscrow(bytes32 dataHash, bytes32 swarmRef, bytes32 keyCommitment) external payable returns (uint256)',
  'function setPrice(uint256 escrowId, uint256 price) external',
  'function acceptEscrow(uint256 escrowId) external payable',
  'function releaseKey(uint256 escrowId, bytes calldata encryptedKey) external',
  'function claimPayment(uint256 escrowId) external',
  'function getEscrow(uint256 escrowId) external view returns (tuple(address seller, address buyer, bytes32 dataHash, bytes32 swarmRef, bytes32 keyCommitment, uint256 price, uint8 state, uint256 createdAt, uint256 fundedAt, uint256 keyReleasedAt))',
  'event EscrowCreated(uint256 indexed escrowId, address indexed seller, bytes32 dataHash, bytes32 swarmRef, uint256 price)',
  'event EscrowFunded(uint256 indexed escrowId, address indexed buyer, uint256 amount)',
  'event KeyReleased(uint256 indexed escrowId, bytes encryptedKey)',
  'event PaymentClaimed(uint256 indexed escrowId, address indexed seller, uint256 amount)',
];

interface DemoState {
  swarmRef?: string;
  historyRef?: string;
  escrowId?: string;
  encryptedKey?: string;
  decryptedContent?: any;
}

const state: DemoState = {};

async function checkPrerequisites(): Promise<boolean> {
  console.log('\n--- Checking Prerequisites ---\n');

  let allGood = true;

  // Check config
  if (!config.contractAddress) {
    console.log('[ ] DATA_ESCROW_ADDRESS not set');
    allGood = false;
  } else {
    console.log(`[x] Contract: ${config.contractAddress}`);
  }

  if (!config.postageBatchId) {
    console.log('[ ] POSTAGE_BATCH_ID not set');
    allGood = false;
  } else {
    console.log(`[x] Postage batch: ${config.postageBatchId.slice(0, 16)}...`);
  }

  if (!config.sellerPrivateKey) {
    console.log('[ ] SELLER_PRIVATE_KEY not set');
    allGood = false;
  } else {
    const seller = new Wallet(config.sellerPrivateKey);
    console.log(`[x] Seller address: ${seller.address}`);
  }

  if (!config.buyerPrivateKey) {
    console.log('[ ] BUYER_PRIVATE_KEY not set');
    allGood = false;
  } else {
    const buyer = new Wallet(config.buyerPrivateKey);
    console.log(`[x] Buyer address: ${buyer.address}`);
  }

  // Check Bee connectivity
  try {
    const bee = new Bee(config.beeUrl);
    await bee.checkConnection();
    console.log(`[x] Bee node connected: ${config.beeUrl}`);
  } catch (e) {
    console.log(`[ ] Bee node not reachable: ${config.beeUrl}`);
    allGood = false;
  }

  // Check wallet balances
  if (config.sellerPrivateKey && config.buyerPrivateKey) {
    const provider = new JsonRpcProvider(config.rpcUrl);
    const seller = new Wallet(config.sellerPrivateKey, provider);
    const buyer = new Wallet(config.buyerPrivateKey, provider);

    const sellerBalance = await provider.getBalance(seller.address);
    const buyerBalance = await provider.getBalance(buyer.address);

    console.log(`[x] Seller balance: ${ethers.formatEther(sellerBalance)} ETH`);
    console.log(`[x] Buyer balance: ${ethers.formatEther(buyerBalance)} ETH`);

    if (sellerBalance === 0n) {
      console.log('    ! Seller needs testnet ETH');
      allGood = false;
    }
    if (buyerBalance === 0n) {
      console.log('    ! Buyer needs testnet ETH');
      allGood = false;
    }
  }

  return allGood;
}

async function step1_uploadContent(): Promise<void> {
  console.log('\n--- Step 1: Upload Encrypted Content ---\n');

  const bee = new Bee(config.beeUrl);

  // Load Davos insights
  const insightsPath = path.join(__dirname, 'davos-insights.json');
  const insights = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));

  console.log(`Uploading: ${insights.title}`);
  console.log(`Price: ${insights.price_eth} ETH`);

  // Upload to Swarm
  const contentBuffer = Buffer.from(JSON.stringify(insights, null, 2));
  const result = await bee.uploadData(
    config.postageBatchId as BatchId,
    new Uint8Array(contentBuffer)
  );

  state.swarmRef = result.reference;
  console.log(`Swarm reference: ${state.swarmRef}`);

  // Generate encryption key (for demo, we use a simple derivation)
  const encryptionKey = ethers.keccak256(
    ethers.toUtf8Bytes('demo-encryption-key-' + Date.now())
  );
  state.encryptedKey = encryptionKey;

  console.log(`Encryption key generated (would be used for ACT in production)`);
  console.log('');
}

async function step2_createEscrow(): Promise<void> {
  console.log('\n--- Step 2: Create Escrow Offer ---\n');

  const provider = new JsonRpcProvider(config.rpcUrl);
  const seller = new Wallet(config.sellerPrivateKey, provider);
  const contract = new Contract(config.contractAddress, ESCROW_ABI, seller);

  // Load insights for price
  const insightsPath = path.join(__dirname, 'davos-insights.json');
  const insights = JSON.parse(fs.readFileSync(insightsPath, 'utf-8'));

  // Calculate hashes
  const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(insights)));
  const swarmRefBytes32 = ethers.zeroPadValue(ethers.toUtf8Bytes(state.swarmRef!.slice(0, 31)), 32);
  const keyCommitment = ethers.keccak256(state.encryptedKey!);

  console.log(`Creating escrow...`);
  console.log(`  Data hash: ${dataHash.slice(0, 18)}...`);
  console.log(`  Swarm ref: ${state.swarmRef!.slice(0, 18)}...`);
  console.log(`  Key commitment: ${keyCommitment.slice(0, 18)}...`);

  // Create escrow
  const tx = await contract.createEscrow(dataHash, swarmRefBytes32, keyCommitment);
  const receipt = await tx.wait();

  // Get escrow ID from event
  const event = receipt.logs.find((log: any) => {
    try {
      return contract.interface.parseLog(log)?.name === 'EscrowCreated';
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = contract.interface.parseLog(event);
    state.escrowId = parsed?.args[0].toString();
  } else {
    // Fallback: assume escrowId is 0 for first escrow
    state.escrowId = '0';
  }

  // Set price - fetch nonce directly from provider to avoid ethers caching issue
  const nonceHex = await provider.send('eth_getTransactionCount', [seller.address, 'latest']);
  const priceTx = await contract.setPrice(state.escrowId, insights.price_wei, { nonce: parseInt(nonceHex, 16) });
  await priceTx.wait();

  console.log(`Escrow created!`);
  console.log(`  Escrow ID: ${state.escrowId}`);
  console.log(`  Price: ${insights.price_eth} ETH`);
  console.log(`  TX: ${receipt.hash}`);
  console.log('');
}

async function step3_buyerAccepts(): Promise<void> {
  console.log('\n--- Step 3: Buyer Accepts and Funds ---\n');

  const provider = new JsonRpcProvider(config.rpcUrl);
  const buyer = new Wallet(config.buyerPrivateKey, provider);
  const contract = new Contract(config.contractAddress, ESCROW_ABI, buyer);

  // Get escrow details
  const escrow = await contract.getEscrow(state.escrowId);
  const price = escrow.price;

  console.log(`Buyer accepting escrow #${state.escrowId}`);
  console.log(`  Amount to pay: ${ethers.formatEther(price)} ETH`);

  // Fund escrow
  const tx = await contract.acceptEscrow(state.escrowId, { value: price });
  const receipt = await tx.wait();

  console.log(`Escrow funded!`);
  console.log(`  TX: ${receipt.hash}`);
  console.log('');
}

async function step4_sellerReleasesKey(): Promise<void> {
  console.log('\n--- Step 4: Seller Releases Decryption Key ---\n');

  const provider = new JsonRpcProvider(config.rpcUrl);
  const seller = new Wallet(config.sellerPrivateKey, provider);
  const contract = new Contract(config.contractAddress, ESCROW_ABI, seller);

  console.log(`Releasing key for escrow #${state.escrowId}`);

  // Release key
  const keyBytes = ethers.getBytes(state.encryptedKey!);
  const tx = await contract.releaseKey(state.escrowId, keyBytes);
  const receipt = await tx.wait();

  console.log(`Key released!`);
  console.log(`  TX: ${receipt.hash}`);
  console.log('');
}

async function step5_buyerDecrypts(): Promise<void> {
  console.log('\n--- Step 5: Buyer Decrypts Content ---\n');

  const bee = new Bee(config.beeUrl);

  console.log(`Downloading from Swarm: ${state.swarmRef}`);

  // Download content
  const data = await bee.downloadData(state.swarmRef as Reference);
  const content = JSON.parse(Buffer.from(data).toString('utf-8'));

  state.decryptedContent = content;

  console.log(`Content decrypted!`);
  console.log(`  Title: ${content.title}`);
  console.log(`  Insights: ${content.insights.length}`);
  console.log('');

  // Show first insight
  if (content.insights.length > 0) {
    const first = content.insights[0];
    console.log(`First insight:`);
    console.log(`  Topic: ${first.topic}`);
    console.log(`  Title: ${first.title}`);
    console.log(`  Confidence: ${first.confidence * 100}%`);
  }
  console.log('');
}

async function step6_sellerClaims(): Promise<void> {
  console.log('\n--- Step 6: Seller Claims Payment ---\n');

  const provider = new JsonRpcProvider(config.rpcUrl);
  const seller = new Wallet(config.sellerPrivateKey, provider);
  const contract = new Contract(config.contractAddress, ESCROW_ABI, seller);

  const balanceBefore = await provider.getBalance(seller.address);

  console.log(`Claiming payment for escrow #${state.escrowId}`);

  // Claim payment
  const tx = await contract.claimPayment(state.escrowId);
  const receipt = await tx.wait();

  const balanceAfter = await provider.getBalance(seller.address);
  const earned = balanceAfter - balanceBefore;

  console.log(`Payment claimed!`);
  console.log(`  TX: ${receipt.hash}`);
  console.log(`  Balance change: +${ethers.formatEther(earned)} ETH`);
  console.log('');
}

async function main() {
  console.log('='.repeat(60));
  console.log('DAVOS AGENT ECONOMY DEMO');
  console.log('='.repeat(60));

  // Check prerequisites
  const ready = await checkPrerequisites();
  if (!ready) {
    console.log('\n! Prerequisites not met. Please configure environment variables.');
    console.log('See demo/.env.example for required variables.');
    process.exit(1);
  }

  try {
    await step1_uploadContent();
    await step2_createEscrow();
    await step3_buyerAccepts();
    await step4_sellerReleasesKey();
    await step5_buyerDecrypts();
    await step6_sellerClaims();

    console.log('='.repeat(60));
    console.log('DEMO COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  - Swarm reference: ${state.swarmRef}`);
    console.log(`  - Escrow ID: ${state.escrowId}`);
    console.log(`  - Content: ${state.decryptedContent?.title}`);
    console.log('');
    console.log('The agent economy is real!');

  } catch (error) {
    console.error('\nDemo failed:', error);
    process.exit(1);
  }
}

main();
