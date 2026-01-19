#!/usr/bin/env npx tsx
/**
 * Two Agents Interaction Test
 *
 * Tests the agent-to-agent knowledge exchange flow:
 * 1. Start seller's HTTP discovery endpoint
 * 2. Seller creates a knowledge offering
 * 3. Buyer discovers the offering via HTTP
 * 4. Buyer requests to purchase
 *
 * Run: npx tsx demo/two-agents-test.ts
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const SELLER_PORT = 3001;
const BUYER_PORT = 3002;

// Colors for console output
const colors = {
  seller: '\x1b[34m', // Blue
  buyer: '\x1b[32m',  // Green
  system: '\x1b[33m', // Yellow
  reset: '\x1b[0m',
};

function log(role: 'seller' | 'buyer' | 'system', message: string) {
  const color = colors[role];
  const prefix = role.toUpperCase().padEnd(7);
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function httpGet(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

async function httpPost(url: string, data: any): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function main() {
  console.log('='.repeat(60));
  console.log('TWO AGENTS INTERACTION TEST');
  console.log('='.repeat(60));
  console.log('');

  // ============================================================================
  // Step 1: Start Seller's Discovery API (simulated via direct function call)
  // ============================================================================
  log('system', 'Setting up seller knowledge store...');

  // Import the knowledge module directly
  const knowledgeModule = await import('../src/tools/knowledge.js');

  // Set environment for seller
  process.env.DISCOVERY_PORT = SELLER_PORT.toString();
  process.env.KNOWLEDGE_STORE_PATH = path.join(__dirname, '.seller-knowledge.json');
  process.env.WALLET_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil account 0

  // Start seller's HTTP endpoint
  const sellerServer = knowledgeModule.createDiscoveryAPI();
  log('seller', `Discovery API started on http://localhost:${SELLER_PORT}`);

  await sleep(500); // Give server time to start

  // ============================================================================
  // Step 2: Seller creates a knowledge offering
  // ============================================================================
  log('seller', 'Creating knowledge offering...');

  const createResult = await knowledgeModule.handleKnowledgeTool('knowledge_create_offering', {
    title: 'Davos 2026 Strategic Insights',
    description: 'Key strategic insights from World Economic Forum Davos 2026, focused on AI governance and data sovereignty.',
    price_eth: '0.001',
    content: JSON.stringify({
      insights: [
        {
          topic: 'AI Governance',
          insight: 'Major economies agreed on baseline AI safety standards with focus on agentic AI systems.',
          confidence: 0.85,
        },
        {
          topic: 'Data Sovereignty',
          insight: 'Three G20 nations announced support for personal data vault standards.',
          confidence: 0.9,
        },
      ],
    }),
    tags: ['davos', 'AI', 'strategy', 'data-sovereignty'],
  });

  const createData = JSON.parse(createResult.content[0].text);
  log('seller', `Offering created: ${createData.offering.id}`);
  log('seller', `  Title: ${createData.offering.title}`);
  log('seller', `  Price: ${createData.offering.price_eth} ETH`);

  console.log('');

  // ============================================================================
  // Step 3: Buyer discovers offerings via HTTP
  // ============================================================================
  log('buyer', 'Discovering knowledge offerings...');

  const discoverUrl = `http://localhost:${SELLER_PORT}/api/offerings`;
  const offerings = await httpGet(discoverUrl);

  log('buyer', `Found ${offerings.count} offering(s) from instance ${offerings.instanceId}`);
  offerings.offerings.forEach((o: any) => {
    log('buyer', `  - ${o.title} (${o.price_eth} ETH)`);
  });

  console.log('');

  // ============================================================================
  // Step 4: Buyer queries specific offering
  // ============================================================================
  const targetOffering = offerings.offerings[0];
  log('buyer', `Requesting details for: ${targetOffering.id}`);

  const offeringDetails = await httpGet(
    `http://localhost:${SELLER_PORT}/api/offerings/${targetOffering.id}`
  );

  log('buyer', `Offering details:`);
  log('buyer', `  Title: ${offeringDetails.title}`);
  log('buyer', `  Description: ${offeringDetails.description}`);
  log('buyer', `  Price: ${offeringDetails.price_eth} ETH (${offeringDetails.price_wei} wei)`);
  log('buyer', `  Seller: ${offeringDetails.seller}`);
  log('buyer', `  Tags: ${offeringDetails.tags.join(', ')}`);

  console.log('');

  // ============================================================================
  // Step 5: Buyer initiates purchase
  // ============================================================================
  log('buyer', 'Initiating purchase...');

  const purchaseResult = await httpPost(`http://localhost:${SELLER_PORT}/api/purchase`, {
    offering_id: targetOffering.id,
    buyer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Anvil account 1
  });

  log('buyer', `Purchase initiated:`);
  log('buyer', `  Offering: ${purchaseResult.offering_id}`);
  log('buyer', `  Price: ${purchaseResult.price_wei} wei`);
  log('buyer', `  Seller: ${purchaseResult.seller}`);
  log('buyer', `  Next step: ${purchaseResult.instructions}`);

  console.log('');
  console.log('='.repeat(60));
  console.log('TEST COMPLETE!');
  console.log('='.repeat(60));
  console.log('');
  log('system', 'Summary:');
  log('system', '  1. Seller created knowledge offering');
  log('system', '  2. Buyer discovered offerings via HTTP');
  log('system', '  3. Buyer retrieved offering details');
  log('system', '  4. Buyer initiated purchase request');
  console.log('');
  log('system', 'Next steps for full escrow flow:');
  log('system', '  - Deploy DataEscrow.sol to Sepolia');
  log('system', '  - Buyer funds escrow with share_escrow_accept');
  log('system', '  - Seller releases key with share_escrow_release');
  log('system', '  - Buyer decrypts content');
  log('system', '  - Seller claims payment');

  // Cleanup
  sellerServer.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
