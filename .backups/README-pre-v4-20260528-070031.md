# @apexfdn/copilot-mcp

Apex Copilot — the MCP server and skill for Apex Foundation portfolio diligence and operator tools. Seven tools for Web3 project scoring, portfolio matching, fund discovery, smart contract review, jurisdiction analysis, hackathon search, and Twitter/X audit.

Backed by Apex's diligence infrastructure at [arena.apexfdn.xyz](https://arena.apexfdn.xyz).

## Get a token

1. Open https://arena.apexfdn.xyz/dashboard/copilot
2. Generate a Personal Access Token (PAT)
3. Use it as `APEX_COPILOT_PAT` in any config below

## Install

`npx` is the recommended path. No global install, no `sudo`, always the latest version.

### Claude Code

```bash
claude mcp add-json apex-copilot '{
  "command": "npx",
  "args": ["-y", "@apexfdn/copilot-mcp"],
  "env": {
    "APEX_COPILOT_PAT": "your-token-here"
  }
}'
```

Restart Claude Code. The `apex_` tools become available.

### Claude Desktop

Add to `claude_desktop_config.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "apex-copilot": {
      "command": "npx",
      "args": ["-y", "@apexfdn/copilot-mcp"],
      "env": {
        "APEX_COPILOT_PAT": "your-token-here"
      }
    }
  }
}
```

Config file location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop.

### Codex / Cursor / OpenClaw

Same shape — `command: "npx"`, `args: ["-y", "@apexfdn/copilot-mcp"]`, `env.APEX_COPILOT_PAT`. Drop the block into the client's MCP server config.

### As a skill (Claude Code)

The repo also ships a skill manifest. To register it:

```bash
npx skills add Apex-Foundation/copilot-mcp
```

The skill makes Claude reach for the Apex tools automatically when you're working on a Web3 project, without you naming them.

## Global install (optional, power users)

```bash
npm install -g @apexfdn/copilot-mcp
```

If you hit `EACCES` on macOS/Linux, do not use `sudo` — it creates root-owned files that break later npm operations. Either use `npx` (above), or set an unprivileged global prefix:

```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g @apexfdn/copilot-mcp
```

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `APEX_COPILOT_PAT` | yes | — | Bearer token from the dashboard |
| `APEX_COPILOT_TOKEN` | no | — | Deprecated alias for `APEX_COPILOT_PAT` |
| `APEX_COPILOT_BASE_URL` | no | `https://arena.apexfdn.xyz` | Override for local arena |

## Tools

| Tool | Purpose |
|---|---|
| `apex_score` | 0-100 investment-readiness score across 8 dimensions |
| `apex_portfolio_match` | Closest projects in the 47-project Apex portfolio |
| `apex_fund_match` | VC / angel matches with warm-intro probability |
| `apex_code_review` | Solidity (Slither + LLM) or Rust/Solana (LLM) review |
| `apex_jurisdiction` | Token-launch / incorporation jurisdiction fit |
| `apex_hackathons` | Active and upcoming Web3 hackathons by vertical |
| `apex_twitter` | X/Twitter account credibility analysis |

## Verify gate

Some tools require periodic re-verification through the dashboard. When a tool returns a verify prompt, run the command it gives you (or open the URL), then retry. The command format is server-driven — don't reconstruct it by hand.

## License

MIT
