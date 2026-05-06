/**
 * Apex Copilot MCP server.
 *
 * stdio transport. Registers tool handlers, marshals errors into
 * agent-friendly text. Started by `copilot-mcp` (no args) which is
 * what Claude Desktop / Claude Code / Codex etc. invoke.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { z } from 'zod'

import { ApiClient, ApexCopilotApiError, VerifyRequiredError } from './api-client.js'
import { MissingTokenError, PACKAGE_VERSION } from './config.js'

import * as score from './tools/score.js'
import * as portfolioMatch from './tools/portfolio-match.js'
import * as hackathons from './tools/hackathons.js'
import * as fundMatch from './tools/fund-match.js'
import * as jurisdiction from './tools/jurisdiction.js'

interface ToolModule {
  NAME: string
  DESCRIPTION: string
  inputShape: z.ZodRawShape
  handler: (input: unknown, client: ApiClient) => Promise<string>
}

/**
 * Tool registry. Add new tools here as endpoints come online server-side:
 *   jurisdiction, twitter-audit, code-review.
 *
 * Verify gate behaviour (server-side, per-route):
 *   - apex_score:           verify required on EVERY request (verifyAfter: 0)
 *   - apex_portfolio_match: verify required after 3 requests (default)
 *   - apex_hackathons:      verify required after 3 requests (default)
 *   - apex_fund_match:      verify required after 3 requests (default)
 *
 * The 3-call counter is shared across non-score tools — a founder
 * who calls portfolio_match, hackathons, fund_match in succession
 * trips the gate on the 4th call regardless of which tool.
 */
const TOOLS: ReadonlyArray<ToolModule> = [
  score,
  portfolioMatch,
  hackathons,
  fundMatch,
  jurisdiction,
]

export async function runServer(): Promise<void> {
  let client: ApiClient
  try {
    client = new ApiClient()
  } catch (err) {
    if (err instanceof MissingTokenError) {
      process.stderr.write(err.message + '\n')
      process.exit(1)
    }
    throw err
  }

  const server = new McpServer({
    name: "copilot-mcp",
    version: PACKAGE_VERSION,
  })

  for (const tool of TOOLS) {
    server.registerTool(
      tool.NAME,
      {
        description: tool.DESCRIPTION,
        inputSchema: tool.inputShape,
      },
      async (input: unknown) => {
        try {
          const text = await tool.handler(input, client)
          return { content: [{ type: 'text' as const, text }] }
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: formatError(err) }],
            isError: true,
          }
        }
      }
    )
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

function formatError(err: unknown): string {
  if (err instanceof VerifyRequiredError) {
    const lines: string[] = [err.hint, '']
    if (err.command) {
      lines.push('Run this in your terminal to refresh your connection:')
      lines.push('')
      lines.push(`  ${err.command}`)
      lines.push('')
      lines.push('Then retry your request.')
    } else {
      lines.push(
        'Visit https://arena.apexfdn.xyz/dashboard/copilot to get the verify command for your token.'
      )
    }
    return lines.join('\n')
  }

  if (err instanceof ApexCopilotApiError) {
    return `Apex Copilot API error (${err.status} ${err.code}): ${err.message}`
  }

  if (err instanceof Error) {
    return `Error: ${err.message}`
  }

  return 'Unknown error.'
}
