#!/usr/bin/env npx tsx
/**
 * Check Sepolia wallet balances
 */

import { JsonRpcProvider, Wallet, formatEther } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple .env loader
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

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  const provider = new JsonRpcProvider(rpcUrl);

  console.log('RPC:', rpcUrl);
  console.log('Contract:', process.env.DATA_ESCROW_ADDRESS);
  console.log('');

  const sellerKey = process.env.SELLER_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  const buyerKey = process.env.BUYER_PRIVATE_KEY;

  if (sellerKey) {
    const sellerWallet = new Wallet(sellerKey, provider);
    const balance = await provider.getBalance(sellerWallet.address);
    console.log('Seller:', sellerWallet.address);
    console.log('Balance:', formatEther(balance), 'ETH');
  } else {
    console.log('Seller: NOT CONFIGURED');
  }

  console.log('');

  if (buyerKey) {
    const buyerWallet = new Wallet(buyerKey, provider);
    const balance = await provider.getBalance(buyerWallet.address);
    console.log('Buyer:', buyerWallet.address);
    console.log('Balance:', formatEther(balance), 'ETH');
  } else {
    console.log('Buyer: NOT CONFIGURED');
  }
}

main().catch(console.error);
