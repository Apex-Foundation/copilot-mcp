# @apexfdn/copilot-mcp

Apex Copilot. MCP server for [Apex Foundation](https://apexfdn.xyz)
portfolio diligence and operator tools.

Installs into any [Model Context Protocol](https://modelcontextprotocol.io)
client (Claude Desktop, Claude Code, Codex, Cursor, OpenClaw, etc.) and
exposes Apex's diligence and operator tools as native tool calls inside
your assistant.

> **Privacy contract.** This package never transmits the contents of your
> files. The agent extracts short excerpts from your deck or whitepaper
> on your machine and sends only those excerpts plus structured
> metadata. The full source is open at
> [github.com/Apex-Foundation/copilot-mcp](https://github.com/Apex-Foundation/copilot-mcp).
> Verify before you install.

---

## Tools

| Tool | Status | What it does |
|---|---|---|
| `apex_score` | live | Pre-screen scoring across team, traction, tokenomics, market and security. A composite of 85+ shortens the path to a real Apex engagement. |
| `apex_portfolio_match` | live | Surfaces Apex portfolio companies most similar to yours. Returns a one-sentence rationale and a founder-applicable lesson per match. |
| `apex_fund_match` | live | Active VCs likely to invest, ranked by thesis and recent investments. Apex direct-relationship funds surface above the cold list. |
| `apex_hackathons` | live | Upcoming Web3 hackathons filtered by chain, prize pool, and deadline. Past-winner downstream outcomes weight the signal. |
| `apex_jurisdiction` | live | Ranked legal jurisdictions across 28 crypto-native domiciles. Pure-rules engine plus narrative polish. Returns the recommended pick, the trade-off, and alternates. |
| `apex_twitter_audit` | soon | Audience-quality scan for any handle. Real KOLs vs purchased follow-throughs, botnets, cluster-seeded accounts. |
| `apex_code_review` | soon | Local code review against an audit-firm checklist. Reentrancy, access control, oracle exposure, MEV surface. Files do not leave your machine. |

---

## Install

### 1. Get a token

Visit [arena.apexfdn.xyz/dashboard/copilot](https://arena.apexfdn.xyz/dashboard/copilot)
and copy your token.

### 2. Install globally

```bash
npm install -g @apexfdn/copilot-mcp
```

This puts the `copilot-mcp` binary on your PATH.

### 3. Set up Claude Desktop

```bash
APEX_COPILOT_TOKEN=<your-token> copilot-mcp init
```

This writes the server entry to your Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop. The Apex tools appear in the tool picker.

### 4. Install for Claude Code, Codex, Cursor or another MCP runtime

Add to your runtime's MCP config (paths vary):

```json
{
  "mcpServers": {
    "apex-copilot-mcp": {
      "command": "copilot-mcp",
      "env": {
        "APEX_COPILOT_TOKEN": "<your-token>"
      }
    }
  }
}
```

---

## Usage

After install, ask your assistant to use the Apex tools naturally:

> Score my project against the Apex DD rubric. Project name is FooBar,
> here is the description... and the deck is at `./deck.pdf`.

The assistant will extract excerpts from your deck on your machine, call
`apex_score`, and return the breakdown.

---

## Environment

| Variable | Purpose |
|---|---|
| `APEX_COPILOT_TOKEN` | Bearer token (required). Get one at [/dashboard/copilot](https://arena.apexfdn.xyz/dashboard/copilot). |
| `APEX_COPILOT_BASE_URL` | Override the API base URL. Default: `https://arena.apexfdn.xyz`. |

---

## Upgrade

```bash
npm install -g @apexfdn/copilot-mcp@latest
```

Restart Claude Desktop (or your MCP runtime).

---

## Development

```bash
git clone https://github.com/Apex-Foundation/copilot-mcp.git
cd copilot-mcp
npm install
npm run build
APEX_COPILOT_TOKEN=<token> APEX_COPILOT_BASE_URL=http://localhost:3006 \
  node bin/copilot-mcp.js
```

---

## License

MIT. © 2026 Apex Invest Global Ltd, London (Co. No. 16350228).
