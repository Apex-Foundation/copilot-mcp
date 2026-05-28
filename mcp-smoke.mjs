#!/usr/bin/env node
/**
 * MCP smoke test runner.
 *
 * Runs every Apex Copilot tool against the live arena endpoints and
 * prints a pass/fail table.
 *
 * Assumes the script lives in /var/www/apex-copilot-mcp/ and uses
 * relative imports to the compiled dist/ tools.
 *
 * Requirements:
 *   APEX_COPILOT_PAT env var            (your token)
 *   DATABASE_URL env var                (test fixture reset)
 *   USER_ID env var                     (your user id)
 *
 * Usage:
 *   cd /var/www/apex-copilot-mcp
 *   set -a; . /var/www/arena/.env.local; set +a
 *   APEX_COPILOT_PAT='...' USER_ID='0318f5ad-...' node mcp-smoke.mjs
 */

import { spawn } from 'node:child_process'

const TOKEN = process.env.APEX_COPILOT_PAT
const USER_ID = process.env.USER_ID
const DATABASE_URL = process.env.DATABASE_URL

if (!TOKEN) { console.error('APEX_COPILOT_PAT required'); process.exit(1) }
if (!USER_ID) { console.error('USER_ID required'); process.exit(1) }
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1) }

const { ApiClient, VerifyRequiredError, ApexCopilotApiError } = await import('./dist/api-client.js')
const client = new ApiClient()

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function psql(sql) {
  return new Promise((resolve) => {
    const p = spawn('psql', [DATABASE_URL, '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    p.stdout.on('data', (b) => out += b.toString())
    p.stderr.on('data', (b) => err += b.toString())
    p.on('close', (code) => resolve({ code, out, err }))
  })
}

async function resetGate() {
  await psql(`
    UPDATE copilot_tokens
    SET requests_since_verify = 0,
        code_review_count_today = 0,
        code_review_count_date = (now() at time zone 'utc')::date
    WHERE user_id = '${USER_ID}';
  `)
}

function trunc(s, n = 100) {
  if (!s) return ''
  const flat = String(s).replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n - 1) + '…' : flat
}

// ────────────────────────────────────────────────────────────
// Test cases
// ────────────────────────────────────────────────────────────

const CASES = [
  {
    name: 'apex_score · verify gate fires',
    mod: './dist/tools/score.js',
    input: {
      projectName: 'TestProject',
      projectUrl: 'https://example.com',
      description: 'Test',
      files: [],
    },
    expect: 'verify',
  },
  {
    name: 'apex_score · zod rejects empty name',
    mod: './dist/tools/score.js',
    input: { projectName: '', projectUrl: 'https://example.com' },
    expect: 'error',
  },

  {
    name: 'apex_portfolio_match · happy',
    mod: './dist/tools/portfolio-match.js',
    input: {
      projectName: 'TestDeFi',
      description: 'DeFi lending protocol with cross-chain liquidity routing for institutional users.',
    },
    expect: 'ok',
  },
  {
    name: 'apex_portfolio_match · empty description rejected',
    mod: './dist/tools/portfolio-match.js',
    input: { projectName: 'X', description: '' },
    expect: 'error',
  },

  // FIXED: hackathons handler requires description field
  {
    name: 'apex_hackathons · listing happy',
    mod: './dist/tools/hackathons.js',
    input: {
      description: 'Looking for upcoming Web3 hackathons in DeFi and infrastructure verticals.',
    },
    expect: 'ok',
  },

  {
    name: 'apex_fund_match · happy',
    mod: './dist/tools/fund-match.js',
    input: {
      projectName: 'TestProject',
      description: 'Series A Web3 infrastructure for cross-chain bridges and institutional custody.',
      stage: 'seed',
    },
    expect: 'ok',
  },
  {
    name: 'apex_fund_match · missing description rejected',
    mod: './dist/tools/fund-match.js',
    input: { projectName: 'TestProject' },
    expect: 'error',
  },

  // FIXED: jurisdiction requires useCase enum value
  {
    name: 'apex_jurisdiction · happy',
    mod: './dist/tools/jurisdiction.js',
    input: {
      projectType: 'token-issuer',
      fundraise: 'hybrid',
      needsLicensedActivity: false,
      fundraiseUsd: 5000000,
      teamResidencyRegion: 'mena',
      targetMarketRegion: 'global',
    },
    expect: 'ok',
  },

  {
    name: 'apex_twitter · valid handle',
    mod: './dist/tools/twitter.js',
    input: { handle: 'VitalikButerin' },
    expect: 'ok',
  },
  {
    name: 'apex_twitter · invalid handle (spaces) rejected',
    mod: './dist/tools/twitter.js',
    input: { handle: 'bad handle' },
    expect: 'error',
  },

  {
    name: 'apex_code_review · public solidity repo',
    mod: './dist/tools/code-review.js',
    input: { github_url: 'https://github.com/Uniswap/v2-core' },
    expect: 'ok',
    slow: true,
  },
  {
    name: 'apex_code_review · both inputs rejected',
    mod: './dist/tools/code-review.js',
    input: {
      github_url: 'https://github.com/x/y',
      contract_source: 'contract X {}',
    },
    expect: 'error',
  },
]

// ────────────────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────────────────

const results = []

for (const c of CASES) {
  await resetGate()
  const t0 = Date.now()
  const row = { name: c.name, status: '?', ms: 0, note: '' }
  try {
    const mod = await import(c.mod)
    const out = await mod.handler(c.input, client)
    row.ms = Date.now() - t0
    if (c.expect === 'ok') {
      row.status = 'PASS'
      row.note = trunc(out, 80)
    } else if (c.expect === 'error') {
      row.status = 'FAIL'
      row.note = 'expected error, got success'
    } else if (c.expect === 'verify') {
      row.status = 'FAIL'
      row.note = 'expected verify gate, got success'
    }
  } catch (err) {
    row.ms = Date.now() - t0
    if (c.expect === 'ok') {
      row.status = 'FAIL'
      row.note = trunc(err?.message ?? String(err), 100)
    } else if (c.expect === 'error') {
      row.status = 'PASS'
      row.note = trunc(err?.message ?? String(err), 60)
    } else if (c.expect === 'verify') {
      if (err instanceof VerifyRequiredError) {
        row.status = 'PASS'
        row.note = 'verify_required as expected'
      } else {
        row.status = 'FAIL'
        row.note = `expected verify, got ${err?.constructor?.name}: ${trunc(err?.message, 60)}`
      }
    }
  }
  results.push(row)
  console.log(`  ${row.status === 'PASS' ? '✓' : '✗'} ${row.name} (${row.ms}ms)${row.note ? ` — ${row.note}` : ''}`)
}

console.log('\n========================================================')
console.log('Summary')
console.log('========================================================')
const pass = results.filter((r) => r.status === 'PASS').length
const fail = results.filter((r) => r.status === 'FAIL').length
console.log(`PASS: ${pass}   FAIL: ${fail}   TOTAL: ${results.length}`)
if (fail > 0) {
  console.log('\nFailures:')
  for (const r of results.filter((r) => r.status === 'FAIL')) {
    console.log(`  ✗ ${r.name}`)
    console.log(`      ${r.note}`)
  }
}

await resetGate()
console.log('\n(gate reset back to 0 after run)')

process.exit(fail > 0 ? 1 : 0)
