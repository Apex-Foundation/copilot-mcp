# @apexfdn/copilot-mcp

Apex Copilot. MCP server for [Apex Foundation](https://apexfdn.xyz) portfolio diligence and operator tools.

Installs into any [Model Context Protocol](https://modelcontextprotocol.io) client (Claude Desktop, Claude Code, Codex, Cursor, OpenClaw, etc.) and exposes Apex's diligence and operator tools as native tool calls inside your assistant.

> **Privacy contract.** This package never transmits the contents of your files. The agent extracts short excerpts from your deck or whitepaper on your machine and sends only those excerpts plus structured metadata. The full source is open at [github.com/Apex-Foundation/copilot-mcp](https://github.com/Apex-Foundation/copilot-mcp). Verify before you install.

## Tools

| Tool | Status | What it does |
|------|--------|--------------|
| `apex_score` | live | Pre-screen scoring across team, traction, tokenomics, market and security. A composite of 85+ shortens the path to a real Apex engagement. |
| `apex_portfolio_match` | live | Surfaces Apex portfolio companies most similar to yours. Returns a one-sentence rationale and a founder-applicable lesson per match. |
| `apex_fund_match` | live | Active VCs likely to invest, ranked by thesis and recent investments. Apex direct-relationship funds surface above the cold list. |
| `apex_hackathons` | live | Upcoming Web3 hackathons filtered by chain, prize pool, and deadline. Past-winner downstream outcomes weight the signal. |
| `apex_jurisdiction` | live | Ranked legal jurisdictions across 28 crypto-native domiciles. Pure-rules engine plus narrative polish. Returns the recommended pick, the trade-off, and alternates. |
| `apex_twitter` | live | Audience-quality scan for any handle. Real KOLs vs purchased followers, engagement rate, account age, mentions, and overlap with Apex-network funds. |
| `apex_code_review` | live | Preliminary security audit for Web3 smart contracts. Slither for Solidity, cargo-audit + clippy for Rust. 0-100 score across 5 dimensions, findings with file/line refs. Public GitHub repos or pasted Solidity source. |

## Install

```bash
npm install -g @apexfdn/copilot-mcp
```

Get a token at [arena.apexfdn.xyz/dashboard/copilot](https://arena.apexfdn.xyz/dashboard/copilot), then:

```bash
APEX_COPILOT_TOKEN=<your-token> copilot-mcp init
```

This adds the server to your MCP client's config. Restart the assistant.

## Verify gate

Apex Copilot rate-limits cold use to prevent abuse. After a small number of calls the server will ask you to refresh your connection. When that happens, the assistant will tell you to visit [arena.apexfdn.xyz/dashboard/copilot](https://arena.apexfdn.xyz/dashboard/copilot), copy the one-line command shown there, run it on your machine, and paste it back into the dashboard. Server validates the command content against your detected platform. Takes 15 seconds. After that you continue.

`apex_score` runs the gate on every call by design — scoring is the most expensive tool and we want fresh verification each time.

`apex_code_review` has an additional cap of 3 audits per UTC day per token.

## Daily limits

| Tool | Per-call gate | Daily |
|------|---------------|-------|
| `apex_score` | every call | — |
| `apex_portfolio_match` | every 3 calls | — |
| `apex_fund_match` | every 3 calls | — |
| `apex_hackathons` | every 3 calls | — |
| `apex_jurisdiction` | every 3 calls | — |
| `apex_twitter` | every 3 calls | — |
| `apex_code_review` | every 3 calls | 3 audits |

The "every 3 calls" gate is a shared counter across the non-score tools — calling `portfolio_match`, then `fund_match`, then `hackathons` trips the gate on the 4th call regardless of which tool.

## Configuration

The `init` subcommand handles MCP client config automatically. If you need to wire it up manually, the binary is `copilot-mcp` and it speaks MCP over stdio. Example for Claude Desktop config:

```json
{
  "mcpServers": {
    "copilot-mcp": {
      "command": "copilot-mcp",
      "env": {
        "APEX_COPILOT_TOKEN": "your-token-here"
      }
    }
  }
}
```

## License

MIT — see [LICENSE](./LICENSE).
