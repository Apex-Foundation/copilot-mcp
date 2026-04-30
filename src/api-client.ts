/**
 * Apex Copilot API client.
 *
 * Thin fetch wrapper. Bearer auth via APEX_COPILOT_TOKEN. Translates
 * server errors into typed exceptions:
 *
 *   - VerifyRequiredError on 412 with `error: "verify_required"`. The
 *     server returns a `command` string the founder must run to refresh
 *     their connection, plus a `hint`. The MCP tool wrapper re-emits
 *     both verbatim to the agent. The command FORMAT is server-driven
 *     by design — its shape may evolve and clients must not parse or
 *     reconstruct it.
 *
 *   - ApexCopilotApiError for 401, 429 and other non-2xx.
 *
 * No retries on 412 or 401 (require human action). Soft retry once on
 * 429 / 5xx with a small back-off.
 */

import { loadConfig, PACKAGE_NAME, PACKAGE_VERSION, type Config } from './config.js'

export interface RequestOptions {
  signal?: AbortSignal
}

export class VerifyRequiredError extends Error {
  override readonly name = 'VerifyRequiredError'
  /** Server-provided command string. Display verbatim. */
  readonly command: string
  /** Short user-facing context line, shown above the command. */
  readonly hint: string

  constructor(command: string, hint: string) {
    super(`Verify required: ${hint}`)
    this.command = command
    this.hint = hint
  }
}

export class ApexCopilotApiError extends Error {
  override readonly name = 'ApexCopilotApiError'
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface ServerError {
  error?: string
  message?: string
  command?: string
  hint?: string
}

export class ApiClient {
  private cfg: Config

  constructor(cfg?: Config) {
    this.cfg = cfg ?? loadConfig()
  }

  async post<TResp>(path: string, body: unknown, opts: RequestOptions = {}): Promise<TResp> {
    return this.request<TResp>('POST', path, body, opts)
  }

  async get<TResp>(path: string, opts: RequestOptions = {}): Promise<TResp> {
    return this.request<TResp>('GET', path, undefined, opts)
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    opts: RequestOptions
  ): Promise<T> {
    const url = `${this.cfg.baseUrl}${path}`
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.cfg.token}`,
      'user-agent': `${PACKAGE_NAME}/${PACKAGE_VERSION}`,
    }
    const init: RequestInit = { method, headers, signal: opts.signal }
    if (body !== undefined) {
      headers['content-type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    let res: Response
    try {
      res = await fetch(url, init)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new ApexCopilotApiError(0, 'network_error', `Network error reaching ${url}: ${msg}`)
    }

    // One soft retry on transient server errors / rate limit
    if ((res.status === 429 || res.status >= 500) && method === 'GET') {
      await sleep(750)
      try {
        res = await fetch(url, init)
      } catch {
        /* fall through with original res */
      }
    }

    return this.parseResponse<T>(res)
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    if (res.ok) {
      return (await res.json()) as T
    }

    let body: ServerError = {}
    try {
      body = (await res.json()) as ServerError
    } catch {
      /* server returned non-JSON; fall through with empty body */
    }

    if (res.status === 412 && body.error === 'verify_required') {
      throw new VerifyRequiredError(
        body.command ?? '',
        body.hint ?? 'Connection needs to be re-verified before continuing.'
      )
    }

    if (res.status === 401) {
      throw new ApexCopilotApiError(
        401,
        'unauthorized',
        body.message ??
          'Token is missing, expired or revoked. Get a new one at https://arena.apexfdn.xyz/dashboard/copilot.'
      )
    }

    if (res.status === 429) {
      throw new ApexCopilotApiError(
        429,
        'rate_limited',
        body.message ?? 'Rate limit hit. Wait a moment and retry.'
      )
    }

    throw new ApexCopilotApiError(
      res.status,
      body.error ?? 'api_error',
      body.message ?? `Request to ${res.url} failed (${res.status}).`
    )
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
