#!/usr/bin/env node
/**
 * Datacore Alpha MCP Server
 * Simulates a knowledge-based agent responding to RFQs
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

const KB_PATH = path.join(__dirname, 'knowledge', 'datacore-alpha-kb.json');

class DatacoreAlphaMCP {
  private server: Server;
  private knowledgeBase: any;

  constructor() {
    this.server = new Server(
      {
        name: 'datacore-alpha-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Load knowledge base
    this.knowledgeBase = JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'));

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query_knowledge',
          description: 'Query the agent\'s knowledge base for information matching an RFQ',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query or RFQ keywords',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_agent_info',
          description: 'Get agent identity and reputation information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'query_knowledge') {
        const query = String(request.params.arguments?.query || '').toLowerCase();

        // Search knowledge base
        if (query.includes('davos') || query.includes('network') || query.includes('event')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(this.knowledgeBase.knowledge_base.davos_events, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: 'No matching knowledge found',
            },
          ],
        };
      }

      if (request.params.name === 'get_agent_info') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                agent: this.knowledgeBase.agent,
                address: this.knowledgeBase.address,
                location: this.knowledgeBase.location,
                reputation: this.knowledgeBase.reputation,
              }, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Datacore Alpha MCP server running on stdio');
  }
}

const server = new DatacoreAlphaMCP();
server.run().catch(console.error);
