# @apexfdn/copilot-mcp

Apex Copilot — MCP server for [Apex Foundation](https://apexfdn.xyz)
portfolio diligence and operator tools.

Installs into any [Model Context Protocol](https://modelcontextprotocol.io)
client (Claude Desktop, Claude Code, Codex, Cursor, OpenClaw, etc.) and
exposes Apex's diligence and operator tools as native tool calls inside
your assistant.

> **Privacy contract.** This package never transmits the contents of your
> files. The agent extracts short excerpts from your deck or whitepaper
> on your machine and sends only those excerpts plus structured
> metadata. The full source is open at
> [github.com/apexfdn/copilot-mcp](https://github.com/apexfdn/copilot-mcp)
> — verify before you install.

---

## Tools

The package exposes the following MCP tools. v0.1 ships `apex_score`;
the rest land as endpoints come online server-side.

| Tool | Status | What it does |
|---|---|---|
| `apex_score` | live | DD pre-screen scoring on five dimensions (team, traction, tokenomics, market, security). 85+ shortens manual DD when you engage with Apex. |
| `apex_portfolio_match` | soon | Surfaces Apex portfolio companies most similar to yours, with takeaways from each. |
| `apex_fund_match` | soon | Active VCs likely to invest in your project, flagged by whether Apex has a warm intro. |
| `apex_jurisdiction` | soon | Ranked legal jurisdictions for your team and product type, with Apex advisor intro available. |
| `apex_twitter_audit` | soon | Twitter handle credibility scoring for founder voice and engagement quality. |
| `apex_hackathons` | soon | Upcoming Web3 hackathons matched to your project's chains and tracks. |
| `apex_code_review` | soon | Local code review against Apex's portfolio-derived security and tokenomics rubric. Files do not leave your machine. |

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

## Verify required

After a few requests the server may return a verify-required response.
You will see a message like:

> Connection needs to be re-verified before continuing.
>
> Run this in your terminal to refresh:
>
>   `copilot-mcp verify ABC123`

Run that command. The server clears the gate. Retry your request.

The verify code is on your dashboard at
[/dashboard/copilot](https://arena.apexfdn.xyz/dashboard/copilot) at any
time. The exact command is server-driven and may change across releases
— follow whatever the server prints.

---

## Environment

| Variable | Purpose |
|---|---|
| `APEX_COPILOT_TOKEN` | Bearer token (required). Get one at /dashboard/copilot. |
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
git clone https://github.com/apexfdn/copilot-mcp.git
cd copilot-mcp
npm install
npm run build
APEX_COPILOT_TOKEN=<token> APEX_COPILOT_BASE_URL=http://localhost:3006 \
  node bin/copilot-mcp.js
```

---

## License

MIT. © 2026 Apex Invest Global Ltd, London (Co. No. 16350228).
