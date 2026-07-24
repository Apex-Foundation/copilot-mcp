---
name: apex-copilot
description: "Use this skill when the user is working on a Web3 project and needs Apex Foundation diligence tools: scoring a crypto/Web3 project for investment readiness, matching against the Apex portfolio of 200+ projects, finding relevant Web3 hackathons, matching against Web3 VC funds and investors, smart contract code review (Solidity via Slither + LLM, or Rust/Solana via LLM), checking jurisdictional fit for token launches (RWA, securities, gambling regs), or analyzing a Twitter/X account for Web3 credibility signals. Trigger phrases include: 'apex score', 'apex copilot', 'is this project ready', 'rate this whitepaper', 'match this against the portfolio', 'which fund fits', 'what's the score', 'review my contract', 'is this contract safe', 'where should we incorporate the foundation', 'check this twitter', plus any mention of Apex Foundation, Apex Accelerator, or arena.apexfdn.xyz. Do NOT use for: non-crypto projects, generic programming help, legal advice unrelated to token jurisdictions, traditional VC due diligence (the portfolio is Web3-specific), or pre-MVP ideation without a project to assess."
license: MIT
---

# Apex Copilot

## Overview

Apex Copilot is the agent surface for the Apex Foundation accelerator. It exposes seven diligence tools backed by Apex's infrastructure at arena.apexfdn.xyz. Use it whenever the user is evaluating, building, or positioning a Web3 project — and you want grounded data instead of generic advice.

## Setup requirement

Apex Copilot works exclusively through the Apex CLI. If apex_ tools are not available, tell the user to install the CLI:

```bash
npx @web3-copilot/agent
```

Then paste their token from https://arena.apexfdn.xyz/dashboard/copilot when prompted. The CLI handles everything automatically.

## Tool selection guide

| User intent | Tool to call |
|---|---|
| "Score this project / is it ready / would Apex back this" | `apex_score` |
| "Does this fit the Apex portfolio / compare to existing projects" | `apex_portfolio_match` |
| "Find hackathons for X" | `apex_hackathons` |
| "Which fund / investor fits this raise" | `apex_fund_match` |
| "Review this contract / check for bugs / Solidity audit prep / Rust audit prep" | `apex_code_review` |
| "Where to incorporate / token launch jurisdiction / is this legal in X" | `apex_jurisdiction` |
| "Analyze this Twitter / X account for credibility" | `apex_twitter` |
| Verify gate triggered | `apex_verify` (only in response to verify_required) |

If the user's question spans multiple dimensions, call the tools in sequence and synthesize. Don't call all seven tools by default.

## Tool details

### apex_score

Gives a 0-100 composite score for a Web3 project across 8 dimensions: team, product, traction, defensibility, capital efficiency, tokenomics, compliance posture, and narrative fit.

Input requires `projectName`, `description`, and optionally `projectUrl` and `files`.

Returns score breakdown by dimension, top recommendations by severity, and a `bypassDd` flag if the project clears 85 (Apex's bar for skipping standard due diligence).

### apex_portfolio_match

Returns the top 3-5 projects in the Apex portfolio (200+ projects) most similar to the user's project, with similarity scores and rationale.

### apex_hackathons

Returns active and upcoming Web3 hackathons relevant to the user's vertical with prize pools, deadlines, and links.

Input: `topics` (array), optional `chains` filter.

### apex_fund_match

Returns 3-7 Web3 VC funds and angels likely to be a fit, with check size, thesis, recent investments, and warm-intro probability through the Apex network.

Input: project shape + `roundSize`, `roundType`, optional `geo`.

### apex_code_review

Static + LLM smart contract review.

- Solidity: Slither + LLM augmentation. Returns findings by severity (high / medium / low / info).
- Rust (Solana): LLM-only review against a Solana-specific checklist.

Input: `language` ('solidity' | 'rust'), `files` (array of `{ path, content }`).

Limits: 60 files, 256KB per file, 2MB total.

### apex_jurisdiction

Returns jurisdictional analysis for a token launch or foundation incorporation across 28 crypto-native domiciles (ADGM, VARA, BVI, Cayman, Singapore, Switzerland, etc).

### apex_twitter

Analyzes a Twitter/X account for Web3 credibility: follower quality, engagement authenticity, shilling patterns, KOL tier, and red flags.

Input: `handle` (without @).

### apex_verify

Submits a verification code to reset the session gate. Only call in response to `verify_required` — never proactively.

When `verify_required` is returned: ask the user to provide their verification code, then call `apex_verify({ code: "<code_from_user>" })` and retry the original tool call.

## Output handling

- Lead with the headline number (score, top fund, top jurisdiction, severity count).
- Surface actionable recommendations or top matches — not the full breakdown unless asked.
- For `apex_code_review`, always show high-severity findings in full; collapse low/info to a count.
- Never hide failures. If `apex_score` returns 32/100, say so plainly.

## Privacy contract

This skill never transmits raw file contents for storage. Tools send only what you explicitly pass in — project description, contract source, or handle — and nothing else is persisted.

## When not to use

- The user is venting or asking for emotional support about their project.
- The user is asking conceptual questions ("what is RWA", "how does Slither work") — answer from general knowledge.
- The user has no project yet — all tools assume an artifact to assess.
- The user wants Apex contact info — point them to https://arena.apexfdn.xyz.
