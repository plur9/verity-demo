# Verity Agent Commerce Demo

**Live demonstration of Verity's Data Business platform for the unDavos 2026 keynote.**

## Overview

This demo tells "Elena's Freedom" story - showing how a tech event curator earns passive income ($24 while sleeping) through autonomous data agent commerce on the blockchain.

**Key Features:**
- Real Sepolia testnet blockchain transactions
- Interactive 7-scene presentation flow
- Live transaction hashes with Etherscan verification
- Presenter-controlled suspense with "Show Blockchain Proof" button

## Current Version

**v2.1.0** - Real Blockchain Integration
- Pre-executed Sepolia transactions embedded
- All TX hashes verifiable on-chain
- Contract: `0xa226C0E0cEa2D8353C9Ec6ee959A03D54F8D14b6`

See [VERSION.md](VERSION.md) for full changelog.

## Quick Start

### Running the Demo

```bash
# Start server on Sepolia
npx tsx start-dashboard.ts

# Demo URL
open http://localhost:8080
```

## Demo Structure

### 7 Scenes

1. **The Notification** - Phone buzz, $24.14 earned overnight
2. **The Living Business** - Dashboard showing $141/week revenue
3. **The Global Reach** - Lagos buyer discovers Elena (blockchain proof)
4. **The Product** - What the buyer received
5. **The Human Element** - Corporate vs Builder reactions
6. **The Freedom** - Week summary, consulting comparison
7. **Conclusion** - Final message

### Blockchain Transactions (Scene 3)

Four real Sepolia transactions:

| Step | Action | TX Hash | Time |
|------|--------|---------|------|
| 1 | Create Escrow | `0xd83ece3b...` | 14.2s |
| 2 | Fund Escrow | `0xf202bb90...` | 13.8s |
| 3 | Commit Key | `0x3dd949a80d...` | 12.5s |
| 4 | Reveal Key | `0x1f86f37561...` | 11.9s |

All verifiable on [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xa226C0E0cEa2D8353C9Ec6ee959A03D54F8D14b6).

## Files

| File | Purpose |
|------|---------|
| `stage-demo.html` | Main presentation (v2.1.0) |
| `start-dashboard.ts` | Server with Discovery API |
| `demo-transactions.json` | Pre-executed Sepolia tx data |
| `VERSION.md` | Version history |

## Related

- [Fairdrop Package](https://github.com/fairDataSociety/fairdrive/packages/fairdrop)
- [unDavos Keynote Materials](../../../1-datafund/1-tracks/comms/presentations/)
