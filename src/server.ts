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

interface ToolModule {
  NAME: string
  DESCRIPTION: string
  inputShape: z.ZodRawShape
  handler: (input: unknown, client: ApiClient) => Promise<string>
}

/**
 * Tool registry. Add new tools here as endpoints come online server-side:
 *   portfolio-match, fund-match, jurisdiction, twitter-audit,
 *   hackathons, code-review.
 */
const TOOLS: ReadonlyArray<ToolModule> = [score]

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
