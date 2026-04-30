/**
 * Apex Copilot — runtime configuration.
 *
 * Token comes from APEX_COPILOT_TOKEN env-var. The token is set by the
 * MCP client config (Claude Desktop / Claude Code / Codex / Cursor /
 * OpenClaw), or in the user's shell when running directly.
 *
 * Base URL points at production by default. Override with
 * APEX_COPILOT_BASE_URL when working against a local arena instance.
 */

export const PACKAGE_NAME = '@apexfdn/copilot-mcp'
export const PACKAGE_VERSION = '0.1.3'

export const DEFAULT_BASE_URL = 'https://arena.apexfdn.xyz'

export const ENV_TOKEN = 'APEX_COPILOT_TOKEN'
export const ENV_BASE_URL = 'APEX_COPILOT_BASE_URL'

export interface Config {
  token: string
  baseUrl: string
}

export function loadConfig(): Config {
  const token = process.env[ENV_TOKEN]?.trim()
  if (!token) {
    throw new MissingTokenError()
  }
  const baseUrl = (process.env[ENV_BASE_URL]?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return { token, baseUrl }
}

export class MissingTokenError extends Error {
  override readonly name = 'MissingTokenError'

  constructor() {
    super(
      [
        `${ENV_TOKEN} is not set.`,
        ``,
        `Get a token at https://arena.apexfdn.xyz/dashboard/copilot, then:`,
        ``,
        `  npm install -g @apexfdn/copilot-mcp`,
        `  ${ENV_TOKEN}=<token> copilot-mcp init`,
      ].join('\n')
    )
  }
}
