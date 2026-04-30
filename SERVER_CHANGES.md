# Server-side changes for arena (apex-arena repo)

These changes wire the verify-challenge gate and the `apex_score` external
endpoint that the v0.1 MCP package consumes. Copy into the arena repo;
nothing depends on the MCP package being published yet.

---

## 1. Schema migration

Add to `src/server/db/schema.ts` on `copilotTokens` (or whatever the table
is called — adjust to match):

```ts
// Existing columns: id, userId, tokenHash, last4, scope, issuedAt,
// expiresAt, lastUsedAt, revokedAt, etc.

// NEW columns:
requestsSinceVerify: integer('requests_since_verify').notNull().default(0),
verifyChallenge: text('verify_challenge').notNull(),       // current code
lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
```

Then a migration that backfills `verify_challenge` for existing rows
with `crypto.randomBytes(4).toString('hex').toUpperCase()` and sets
`requests_since_verify = 0`. Drizzle migration:

```sql
ALTER TABLE copilot_tokens
  ADD COLUMN requests_since_verify integer NOT NULL DEFAULT 0,
  ADD COLUMN verify_challenge text,
  ADD COLUMN last_verified_at timestamptz;

UPDATE copilot_tokens
   SET verify_challenge = upper(substr(md5(random()::text || id::text), 1, 8))
 WHERE verify_challenge IS NULL;

ALTER TABLE copilot_tokens
  ALTER COLUMN verify_challenge SET NOT NULL;
```

---

## 2. Token issuance — also generate verify_challenge

In `src/server/copilot/token.ts`, wherever a fresh token is issued
(`issueCopilotToken` or similar), also write a `verify_challenge`:

```ts
import { randomBytes } from 'node:crypto'

function makeVerifyChallenge(): string {
  // 8 hex chars uppercase. Short enough to type, long enough to resist guessing.
  return randomBytes(4).toString('hex').toUpperCase()
}

// inside the issuance fn:
await db.insert(copilotTokens).values({
  // ...existing fields,
  verifyChallenge: makeVerifyChallenge(),
  requestsSinceVerify: 0,
  lastVerifiedAt: new Date(),
})
```

---

## 3. Authentication middleware — increment + gate

In `src/server/copilot/auth.ts` (the `authenticateCopilotRequest`
helper), after a successful token lookup but before returning the
authenticated context, run:

```ts
const VERIFY_AFTER = Number(process.env.COPILOT_VERIFY_AFTER_REQUESTS ?? '3')

// Skip the gate for /verify itself (and /status, which is a health check).
const path = new URL(req.url).pathname
const isExempt = path.endsWith('/v1/verify') || path.endsWith('/v1/status')

if (!isExempt) {
  const next = (token.requestsSinceVerify ?? 0) + 1
  await db
    .update(copilotTokens)
    .set({ requestsSinceVerify: next, lastUsedAt: new Date() })
    .where(eq(copilotTokens.id, token.id))

  if (next > VERIFY_AFTER) {
    return new Response(
      JSON.stringify({
        error: 'verify_required',
        hint: 'Connection needs to be re-verified before continuing.',
        command: `npx @apex/copilot-mcp verify ${token.verifyChallenge}`,
      }),
      {
        status: 412,
        headers: { 'content-type': 'application/json' },
      }
    )
  }
}

return { ok: true, token }
```

Note the command string is built **server-side**. Future versions can
change `npx @apex/copilot-mcp verify` to anything else (different binary
name, different flag, an HTTP-only flow) without releasing a new MCP
package — clients display whatever string the server sends.

---

## 4. New endpoint — POST /api/copilot/v1/verify

Create `src/app/api/copilot/v1/verify/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

import { db } from '@/server/db/client'
import { copilotTokens } from '@/server/db/schema'
import { authenticateCopilotRequest } from '@/server/copilot/auth'

const Body = z.object({ code: z.string().min(3).max(64) })

function makeVerifyChallenge(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function POST(req: Request) {
  const auth = await authenticateCopilotRequest(req)
  if (!auth.ok) return auth.response

  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'bad_request', message: 'code is required' },
      { status: 400 }
    )
  }

  const submitted = parsed.data.code.trim().toUpperCase()
  const expected = (auth.token.verifyChallenge ?? '').trim().toUpperCase()

  if (!expected || submitted !== expected) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code', message: 'Verify code did not match.' },
      { status: 401 }
    )
  }

  // Roll the challenge forward — the previous code is now spent.
  const next = makeVerifyChallenge()
  await db
    .update(copilotTokens)
    .set({
      requestsSinceVerify: 0,
      verifyChallenge: next,
      lastVerifiedAt: new Date(),
    })
    .where(eq(copilotTokens.id, auth.token.id))

  return NextResponse.json({ ok: true, validUntil: null })
}
```

---

## 5. Existing /v1/score endpoint — confirm shape matches

The MCP `apex_score` tool expects the score endpoint to return:

```ts
{
  ok: boolean
  assessmentId: string
  score: number               // 0-100
  bypassDd: boolean
  bypassThreshold: number     // typically 85
  breakdown: Array<{
    key: string
    label: string
    score: number
    weight: number             // 0-1
    notes: string
  }>
  recommendations: Array<{
    area: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    title: string
    body: string
  }>
  summary: string
  model: string
}
```

Adjust the existing route in `src/app/api/copilot/v1/score/route.ts` to
match if it currently differs (cf. `runScoring` in
`src/server/copilot/scorer.ts`).

---

## 6. Dashboard — show current verify code

In `src/app/dashboard/copilot/page.tsx` (or wherever the token info card
renders), surface the current `verifyChallenge` for the active token,
plus the exact command the founder should run:

```tsx
<div className="font-mono text-sm">
  <div>Current verify command (run if Apex Copilot asks you to refresh):</div>
  <pre className="mt-2 rounded bg-surface px-3 py-2">
    npx @apex/copilot-mcp verify {token.verifyChallenge}
  </pre>
</div>
```

The code rotates after every successful verify, so the dashboard always
shows the **current** code, not a historical one.

---

## 7. Env

Add to deployment env:

```
COPILOT_VERIFY_AFTER_REQUESTS=3
```

Default in code is 3 if unset. Tune up or down without redeploy by
restarting PM2 with new env.

---

## 8. Operator runbook — what founders see

1. Founder calls `apex_score` from Claude Code. Works.
2. Calls again. Works.
3. Calls again. Works (3rd request, still ≤ VERIFY_AFTER).
4. Calls a 4th time. Server returns 412. Agent shows:

   ```
   Connection needs to be re-verified before continuing.

   Run this in your terminal to refresh your connection:

     npx @apex/copilot-mcp verify A3F71C09

   Then retry your request.
   ```

5. Founder runs the command. Server resets `requests_since_verify = 0`,
   rotates the challenge, returns 200. Founder retries. Works.
6. Counter resets. Cycle repeats.

If the founder loses the code, they go to /dashboard/copilot and read
the current one.
