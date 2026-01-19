#!/usr/bin/env npx tsx
/**
 * Generate demo wallets for Davos demo
 *
 * Creates two wallets:
 * - Seller (Agent A): Has Davos insights to sell
 * - Buyer (Agent B): Wants to purchase insights
 *
 * Run: npx tsx demo/generate-wallets.ts
 */

import { Wallet, HDNodeWallet, Mnemonic } from 'ethers';

interface DemoWallet {
  role: string;
  address: string;
  privateKey: string;
  mnemonic: string;
}

async function main() {
  console.log('='.repeat(60));
  console.log('DAVOS DEMO WALLET GENERATION');
  console.log('='.repeat(60));
  console.log('');

  const wallets: DemoWallet[] = [];

  // Create Seller wallet (Agent A)
  const sellerWallet = Wallet.createRandom();
  wallets.push({
    role: 'Seller (Agent A)',
    address: sellerWallet.address,
    privateKey: sellerWallet.privateKey,
    mnemonic: sellerWallet.mnemonic!.phrase,
  });

  // Create Buyer wallet (Agent B)
  const buyerWallet = Wallet.createRandom();
  wallets.push({
    role: 'Buyer (Agent B)',
    address: buyerWallet.address,
    privateKey: buyerWallet.privateKey,
    mnemonic: buyerWallet.mnemonic!.phrase,
  });

  // Output wallets
  for (const wallet of wallets) {
    console.log(`${wallet.role}:`);
    console.log(`  Address:     ${wallet.address}`);
    console.log(`  Private Key: ${wallet.privateKey}`);
    console.log(`  Mnemonic:    ${wallet.mnemonic}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('NEXT STEPS:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Get testnet ETH from faucets:');
  console.log('   - https://faucets.chain.link/base-sepolia');
  console.log('   - https://alchemy.com/faucets/base-sepolia');
  console.log('   - https://faucet.quicknode.com/base/sepolia');
  console.log('');
  console.log('2. Fund both addresses with ~0.1 ETH each');
  console.log('');
  console.log('3. Add to .env file:');
  console.log('');
  console.log('   # For deployment (use seller wallet)');
  console.log(`   PRIVATE_KEY=${wallets[0].privateKey}`);
  console.log('');
  console.log('   # For MCP server');
  console.log(`   WALLET_PRIVATE_KEY=${wallets[0].privateKey}`);
  console.log('');
  console.log('4. Save mnemonics securely (for wallet recovery)');
  console.log('');

  // Output JSON for programmatic use
  console.log('='.repeat(60));
  console.log('JSON OUTPUT (for scripts):');
  console.log('='.repeat(60));
  console.log('');
  console.log(JSON.stringify({ seller: wallets[0], buyer: wallets[1] }, null, 2));
}

main().catch(console.error);
