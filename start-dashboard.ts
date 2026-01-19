#!/usr/bin/env npx tsx
/**
 * Datacore Dashboard Server
 *
 * Starts:
 * 1. Seller's discovery API (port 3001)
 * 2. Dashboard web server (port 8080)
 *
 * Usage:
 *   npx tsx demo/start-dashboard.ts           # Use Sepolia config from .env
 *   npx tsx demo/start-dashboard.ts --local   # Use local Anvil
 *
 * Then open http://localhost:8080 in your browser
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env with fallback to global Datacore env
function loadEnv(envPath: string) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  }
}

// Load local .env first
const localEnvPath = path.join(__dirname, '../.env');
loadEnv(localEnvPath);

// Fallback to global Datacore env if local doesn't exist
if (!fs.existsSync(localEnvPath)) {
  const globalEnvPath = path.resolve(process.env.HOME || '~', 'Data/.datacore/env/.env');
  console.log('⚠️  Local .env not found, using global Datacore env:', globalEnvPath);
  loadEnv(globalEnvPath);
}

const DASHBOARD_PORT = 8080;
const DISCOVERY_PORT = 3001;

// Check if running local
const isLocal = process.argv.includes('--local');

// Execute transaction handler
async function executeTransaction(req: http.IncomingMessage, res: http.ServerResponse) {
  const startTime = Date.now();
  const steps: any[] = [];

  try {
    // Import knowledge tools
    const { handleKnowledgeTool } = await import('../src/tools/knowledge.js');

    // Step 1: Create offering (creates escrow)
    const step1Start = Date.now();
    const createResult = await handleKnowledgeTool('knowledge_create_offering', {
      title: 'Davos Ground Truth',
      description: 'Real-time networking intelligence from Davos 2026',
      price_eth: '0.001',
      content: JSON.stringify({
        secret: 'Davos networking intelligence',
        timestamp: new Date().toISOString(),
      }),
      tags: ['davos', 'real-time', 'networking'],
    });
    const step1Duration = Date.now() - step1Start;
    const createData = JSON.parse(createResult.content[0].text);
    steps.push({
      step: 1,
      name: 'Create Escrow',
      txHash: createData.txHash,
      duration: step1Duration,
    });

    // Step 2: Fund escrow (buyer requests)
    const step2Start = Date.now();
    const requestResult = await handleKnowledgeTool('knowledge_request', {
      endpoint: `http://localhost:${DISCOVERY_PORT}`,
      offering_id: createData.offering.id,
    });
    const step2Duration = Date.now() - step2Start;
    const requestData = JSON.parse(requestResult.content[0].text);
    steps.push({
      step: 2,
      name: 'Fund Escrow',
      txHash: requestData.txHash,
      duration: step2Duration,
    });

    // Step 3: Release key
    const step3Start = Date.now();
    const releaseResult = await handleKnowledgeTool('knowledge_release_key', {
      offering_id: createData.offering.id,
    });
    const step3Duration = Date.now() - step3Start;
    const releaseData = JSON.parse(releaseResult.content[0].text);
    steps.push({
      step: 3,
      name: 'Release Key',
      txHash: releaseData.txHash,
      duration: step3Duration,
    });

    // Step 4: Claim payment
    const step4Start = Date.now();
    const claimResult = await handleKnowledgeTool('knowledge_claim_payment', {
      escrow_id: createData.escrowId,
    });
    const step4Duration = Date.now() - step4Start;
    const claimData = JSON.parse(claimResult.content[0].text);
    steps.push({
      step: 4,
      name: 'Claim Payment',
      txHash: claimData.txHash,
      duration: step4Duration,
    });

    const totalDuration = Date.now() - startTime;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      steps,
      totalDuration,
    }));
  } catch (error: any) {
    console.error('Transaction execution failed:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message,
      steps,
    }));
  }
}

// Set environment
process.env.DISCOVERY_PORT = DISCOVERY_PORT.toString();
process.env.KNOWLEDGE_STORE_PATH = path.join(__dirname, '.dashboard-knowledge.json');

if (isLocal) {
  // Use local Anvil
  process.env.SEPOLIA_RPC_URL = process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545';
  process.env.DATA_ESCROW_ADDRESS = process.env.LOCAL_DATA_ESCROW_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  // Use local Anvil wallets
  process.env.SELLER_PRIVATE_KEY = process.env.LOCAL_SELLER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  process.env.BUYER_PRIVATE_KEY = process.env.LOCAL_BUYER_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATACORE AGENT EXCHANGE DASHBOARD');
  console.log('='.repeat(60));
  console.log('');
  console.log('Mode:', isLocal ? 'LOCAL (Anvil)' : 'SEPOLIA');
  console.log('RPC:', process.env.SEPOLIA_RPC_URL);
  console.log('Contract:', process.env.DATA_ESCROW_ADDRESS);
  console.log('');

  // Start discovery API
  console.log(`Starting seller discovery API on port ${DISCOVERY_PORT}...`);
  const knowledgeModule = await import('../src/tools/knowledge.js');
  knowledgeModule.createDiscoveryAPI();

  // Create a sample offering if none exists
  const storePath = process.env.KNOWLEDGE_STORE_PATH!;
  if (!fs.existsSync(storePath)) {
    console.log('Creating sample offering...');

    // Load unDavos content
    const unDavosContentPath = path.join(__dirname, 'undavos-content.json');
    const unDavosContent = JSON.parse(fs.readFileSync(unDavosContentPath, 'utf-8'));

    await knowledgeModule.handleKnowledgeTool('knowledge_create_offering', {
      title: 'Davos Tonight: Where to Network (Live Ground Truth)',
      description: 'Fresh from the ground. Events happening RIGHT NOW at Davos (and around it). Posted 12 minutes ago. Real-time intelligence on the best networking opportunities.',
      price_eth: '0.001',
      content: JSON.stringify(unDavosContent),
      tags: ['davos', 'real-time', 'networking', 'events', 'undavos'],
    });
  }

  // Dashboard web server
  const dashboardServer = http.createServer((req, res) => {
    // Serve stage demo (presentation mode)
    if (req.url === '/' || req.url === '/index.html') {
      const stagePath = path.join(__dirname, 'stage-demo.html');
      const content = fs.readFileSync(stagePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }

    // Serve agent chat (technical demo)
    if (req.url === '/chat') {
      const chatPath = path.join(__dirname, 'agent-chat.html');
      const content = fs.readFileSync(chatPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }

    // Serve dashboard HTML (status view)
    if (req.url === '/status') {
      const dashboardPath = path.join(__dirname, 'dashboard.html');
      const content = fs.readFileSync(dashboardPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }

    // Execute blockchain transaction for demo
    if (req.url === '/api/execute-transaction' && req.method === 'POST') {
      executeTransaction(req, res);
      return;
    }

    // Proxy API requests to discovery server
    if (req.url?.startsWith('/api/')) {
      const proxyReq = http.request(
        {
          hostname: 'localhost',
          port: DISCOVERY_PORT,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      req.pipe(proxyReq);
      proxyReq.on('error', () => {
        res.writeHead(502);
        res.end('Proxy error');
      });
      return;
    }

    // 404 for everything else
    res.writeHead(404);
    res.end('Not found');
  });

  dashboardServer.listen(DASHBOARD_PORT, () => {
    console.log('');
    console.log(`Dashboard running at: http://localhost:${DASHBOARD_PORT}`);
    console.log(`Discovery API at:     http://localhost:${DISCOVERY_PORT}/api/offerings`);
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
  });

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
  });
}

main().catch(console.error);
