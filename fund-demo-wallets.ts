#!/usr/bin/env npx tsx
/**
 * Fund Demo Wallets from Fairdrop ENS Account
 *
 * Transfers 0.1 ETH to each demo wallet (seller and buyer)
 *
 * Usage:
 *   ENS_PRIVATE_KEY=0x... npx tsx demo/fund-demo-wallets.ts
 *
 * Or add ENS_PRIVATE_KEY to .env and run:
 *   npx tsx demo/fund-demo-wallets.ts
 */

import { ethers } from 'ethers';
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

const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/CP_HPZ76hYvOsDJrRyFbA';
const ENS_PRIVATE_KEY = process.env.ENS_PRIVATE_KEY;
const SELLER_ADDRESS = '0x166642b9aA31637bbc265EaEF4183f8066D55F6B';
const BUYER_ADDRESS = '0x33155210b8Dde413bc39903EFcd7Fed4b1F359f6';
const AMOUNT = '0.05'; // ETH per wallet

async function main() {
  console.log('============================================================');
  console.log('FUND DEMO WALLETS');
  console.log('============================================================');
  console.log('');

  if (!ENS_PRIVATE_KEY) {
    console.error('❌ ERROR: ENS_PRIVATE_KEY not found');
    console.error('');
    console.error('Usage:');
    console.error('  ENS_PRIVATE_KEY=0x... npx tsx demo/fund-demo-wallets.ts');
    console.error('');
    console.error('Or add to .env:');
    console.error('  echo "ENS_PRIVATE_KEY=0x..." >> .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ENS_PRIVATE_KEY, provider);

  console.log('Source Wallet (Fairdrop ENS):');
  console.log(`  Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
  console.log('');

  if (balance < ethers.parseEther((parseFloat(AMOUNT) * 2).toString())) {
    console.error(`❌ ERROR: Insufficient balance. Need at least ${parseFloat(AMOUNT) * 2} ETH`);
    process.exit(1);
  }

  console.log('Target Wallets:');
  console.log(`  Seller: ${SELLER_ADDRESS}`);
  console.log(`  Buyer:  ${BUYER_ADDRESS}`);
  console.log(`  Amount: ${AMOUNT} ETH each`);
  console.log('');

  // Send to seller
  console.log('Sending to seller...');
  const txSeller = await wallet.sendTransaction({
    to: SELLER_ADDRESS,
    value: ethers.parseEther(AMOUNT),
  });
  console.log(`  TX: ${txSeller.hash}`);
  await txSeller.wait();
  console.log('  ✓ Confirmed');
  console.log('');

  // Send to buyer
  console.log('Sending to buyer...');
  const txBuyer = await wallet.sendTransaction({
    to: BUYER_ADDRESS,
    value: ethers.parseEther(AMOUNT),
  });
  console.log(`  TX: ${txBuyer.hash}`);
  await txBuyer.wait();
  console.log('  ✓ Confirmed');
  console.log('');

  // Check final balances
  const sellerBalance = await provider.getBalance(SELLER_ADDRESS);
  const buyerBalance = await provider.getBalance(BUYER_ADDRESS);

  console.log('Final Balances:');
  console.log(`  Seller: ${ethers.formatEther(sellerBalance)} ETH`);
  console.log(`  Buyer:  ${ethers.formatEther(buyerBalance)} ETH`);
  console.log('');
  console.log('✅ Done! You can now run the demo.');
}

main().catch((error) => {
  console.error('');
  console.error('❌ ERROR:', error.message);
  process.exit(1);
});
