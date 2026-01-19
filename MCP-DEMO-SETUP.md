# MCP Server Demo Setup

This directory contains MCP servers that simulate knowledge-based agents responding to RFQs in the Verity demo.

## Architecture

**Problem being solved**: The demo needs to show how AI agents create data products on-the-fly from their owner's knowledge bases.

**Solution**: 2 MCP servers with JSON knowledge bases that can be queried:
- `mcp-server-1.ts` → Datacore Alpha (high reputation: 92/100)
- `mcp-server-2.ts` → Event Scout (medium reputation: 67/100)

## Knowledge Bases

Located in `knowledge/`:

### `datacore-alpha-kb.json`
- **Agent**: Datacore Alpha
- **Location**: Davos Congress Centre
- **Reputation**: 92/100
- **Knowledge**: Davos networking events (unDavos, Crypto Davos, WEF)
- **Price**: 0.001 ETH (~$3.00)
- **Swarm verified**: Yes

### `event-scout-kb.json`
- **Agent**: Event Scout
- **Location**: Zurich (remote)
- **Reputation**: 67/100
- **Knowledge**: Davos social calendar (aggregated public data)
- **Price**: 0.0008 ETH (~$2.40)
- **Swarm verified**: Yes

## MCP Server Tools

Each server exposes 2 tools:

1. **`query_knowledge(query: string)`**
   - Searches the agent's knowledge base
   - Returns matching data products
   - Used when RFQ is broadcast

2. **`get_agent_info()`**
   - Returns agent identity, address, location, reputation
   - Used for ERC-8004 verification display

## Running the MCP Servers

```bash
# Terminal 1: Start Datacore Alpha MCP
cd /Users/gregor/Data/3-fds/2-projects/fairdrive/packages/fairdrop
npx tsx demo/mcp-server-1.ts

# Terminal 2: Start Event Scout MCP
npx tsx demo/mcp-server-2.ts
```

## Integration with Demo

The demo currently runs in **simulated mode** (no actual MCP calls yet).

To integrate:
1. Add MCP client library to `start-dashboard.ts`
2. When buyer broadcasts RFQ, query both MCP servers via `query_knowledge()`
3. Display returned offers in Scene 2
4. When buyer selects offer, fetch full data from winning MCP

## Demo Flow

```
1. Buyer creates RFQ → "Need: Davos Networking Events"
2. RFQ broadcast to network
3. MCP Server 1 detects → query_knowledge("davos networking events")
4. MCP Server 2 detects → query_knowledge("davos networking events")
5. Both return data products from their knowledge bases
6. Demo displays 3 offers (MCP1, MCP2, + simulated low-rep broker)
7. Buyer evaluates based on reputation, price, verification
8. Buyer selects Datacore Alpha (highest rep)
9. Transaction executed via escrow
```

## Knowledge Base Structure

Each knowledge base follows this pattern:

```json
{
  "agent": "Agent Name",
  "address": "agent.eth",
  "location": "Physical location",
  "reputation": 92,
  "knowledge_base": {
    "topic_key": {
      "title": "Data Product Title",
      "price_eth": 0.001,
      "price_usd": 3.00,
      "data": { /* actual content */ },
      "swarm_hash": "0x...",
      "verified": true
    }
  }
}
```

## Future Enhancements

1. **Live MCP Integration**: Connect demo to actual MCP servers
2. **Dynamic Pricing**: MCPs calculate price based on data freshness/quality
3. **Real Swarm Storage**: Upload encrypted data to Swarm DHT
4. **ERC-8004 Verification**: Query on-chain reputation data
5. **Multi-hop Knowledge**: MCP servers query sub-agents for specialized knowledge

## Testing MCP Servers

```bash
# Test with MCP inspector
npx @modelcontextprotocol/inspector npx tsx demo/mcp-server-1.ts

# Query knowledge
{
  "name": "query_knowledge",
  "arguments": {
    "query": "davos networking events"
  }
}

# Get agent info
{
  "name": "get_agent_info",
  "arguments": {}
}
```

## Files Created

- `demo/knowledge/datacore-alpha-kb.json` - High-rep agent knowledge
- `demo/knowledge/event-scout-kb.json` - Medium-rep agent knowledge
- `demo/mcp-server-1.ts` - Datacore Alpha MCP server
- `demo/mcp-server-2.ts` - Event Scout MCP server
- `demo/MCP-DEMO-SETUP.md` - This documentation

## Key Insight

**This demonstrates the core value proposition**: Agents don't need pre-made listings. They create data products on-demand by querying their owner's knowledge bases when they detect matching RFQs. The knowledge stays with the owner, agents autonomously package and monetize it.
