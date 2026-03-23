# Phase 3: Production Hardening — Presenter Guide

## What We're Building

Adding production concerns to the pipeline: PII sanitization and cost controls. Each prompt modifies `workflow.ts` in place, with one new utility module (`sanitizer.ts`).

**Prerequisite:** Phase 1 + Phase 2 complete (`workflow.ts` with webhook working).

**Key concepts:** PII sanitization, budget enforcement, pre/post-processing around agents.

---

## Timing Breakdown

| Segment | Duration | Cumulative |
|---------|----------|------------|
| Context / recap Phases 1-2 | 1-2 min | 1-2 min |
| Prompt 1: PII Sanitizer | 5-7 min | 6-9 min |
| Prompt 2: Budget Controls | 5-7 min | 11-16 min |
| Discussion + Q&A | 3-5 min | 14-21 min |

---

## Prompt 1 — PII Sanitizer

**File:** `prompt_1_pii_sanitizer.md` (copy/paste entire file into Claude Code)

**Time target:** 5-7 min (including discussion)

**Concepts introduced:**
- Pre-processing: sanitize input before agents see it
- Post-processing: verify output doesn't leak PII
- Utility module pattern (`sanitizer.ts`)

**What to watch for while Claude Code executes:**
- It creates `sanitizer.ts` as a new utility module — this is the one new file in Phase 3
- It modifies `workflow.ts` to integrate pre/post-processing around the agent pipeline
- The input is sanitized BEFORE agents see it — agents work with redacted content
- Output is scanned as a safety net after Agent 3
- Default input changes to `samples/customer_feedback_report.md`

**Discussion points:**
- "PII never reaches the model — we redact before sending"
- "The output scan is a safety net — the model shouldn't hallucinate PII, but defense in depth"
- "This pattern works for any sensitive data: API keys, credentials, internal URLs"
- Ask: "What other pre/post-processing would you add for your use case?"

### Expected Console Output

```
[Sanitizer] Reading and scanning input document...
[Sanitizer] PII detected in input:
  - email: 8 occurrence(s)
  - phone: 7 occurrence(s)
  - ssn: 1 occurrence(s)
[Sanitizer] Input sanitized. Passing to agent pipeline.

>> Agent 1: Reading the document (sanitized)...
[Agent 1 processes redacted content — no PII visible]

>> Agent 2: Extracting structure...
[extract_structure called on redacted text]

>> Agent 3: Writing the brief...
[Brief produced with [EMAIL_REDACTED] and [PHONE_REDACTED] placeholders]

[Sanitizer] Scanning agent output for leaked PII...
[Sanitizer] No PII leaked into output. All clear.

[Webhook] Sending Slack notification...
[Webhook] Slack notification sent successfully.
```

### Expected Output (Brief)

Same brief structure as Phase 2, but with all PII replaced:

```markdown
## Summary

Three escalated support cases and March NPS survey results highlight a mix of positive momentum and urgent risks. NPS improved to 7.4 (up from 7.1 in Feb), driven by praise for the new dashboard and support responsiveness. However, a broken data export feature, recurring billing errors, and platform outages are driving detractor sentiment and creating active churn risk.

## Key Points

- **Billing discrepancy (Case #4201):** Enterprise customer was double-charged $2,400 in February — second billing error in six months.
- **Data export failure (Case #4218):** March 1st release broke exports for datasets >50K rows (BUG-2855). Workaround costs ~3 engineering hours/week. Customer threatening cancellation.
- **SSO outage (Case #4225):** Intermittent SAML SSO failure affecting ~200 users, caused by clock skew. Temp fix deployed 3/7; permanent fix in Sprint 14.
- **NPS up:** 847 responses, avg 7.4 (from 7.1). 34% promoters, 25% detractors citing outages and export bug.
- **Compliance:** Legacy SSN fields must be purged by March 31.

## Action Items

| # | Owner | Task | Deadline |
|---|---|---|---|
| 1 | Billing team | Audit Enterprise accounts for Feb duplicate charges | TBD |
| 2 | Backend team | Prioritize BUG-2855 (export timeout) | End of March |
| 3 | Auth team | Ship permanent SSO clock-skew fix | Sprint 14 |
| 4 | Support ops | Remove legacy SSN fields from CRM | **March 31** |
| 5 | Customer success | Retention check-ins with at-risk customers | **Before March 20** |

## Decisions

- Refund processed for $2,400 duplicate charge
- Temporary SSO fix deployed (token window extended to 5 min)
- Permanent SSO fix approved for Sprint 14
- SSN field removal initiated for compliance
```

---

## Prompt 2 — Budget Controls (Final Form)

**File:** `prompt_2_budget_controls.md` (copy/paste entire file into Claude Code)

**Time target:** 5-7 min (including discussion)

**Concepts introduced:**
- Cost tracking across multiple agent calls
- Budget enforcement with early termination
- Graceful degradation (save partial results)

**What to watch for while Claude Code executes:**
- It modifies `workflow.ts` again — adds budget tracking around each agent
- `MAX_BUDGET_USD` constant and `cumulativeCostUsd` variable
- Budget check after each agent — pipeline stops early if over budget
- Partial results are still saved and notified via webhook
- This is the "final form" — the complete production-ready pipeline

**Discussion points:**
- "Cost controls are critical for production — a runaway agent loop can be expensive"
- "We save partial results rather than losing everything when budget is exceeded"
- "The cost is tracked cumulatively — each agent's cost adds to the running total"
- Ask: "What budget would you set for your use case? How would you handle alerts?"

### Expected Console Output (normal run, within budget)

```
[COST] Budget: $0.50
[Sanitizer] Input sanitized. Passing to agent pipeline.
>> Agent 1: Reading the document (sanitized)...
[COST] Agent 1 cost: $0.0142 | cumulative: $0.0142 / $0.50
>> Agent 2: Extracting structure...
[COST] Agent 2 cost: $0.0198 | cumulative: $0.0340 / $0.50
>> Agent 3: Writing the brief...
[COST] Agent 3 cost: $0.0156 | cumulative: $0.0496 / $0.50
[Sanitizer] No PII leaked into output. All clear.
[Webhook] Slack notification sent successfully.
[PIPELINE] Pipeline complete. Total cost: $0.0496
```

### Expected Console Output (budget exceeded after Agent 1)

```
[COST] Budget: $0.50
[Sanitizer] Input sanitized. Passing to agent pipeline.
>> Agent 1: Reading the document (sanitized)...
[COST] Agent 1 cost: $0.5200 | cumulative: $0.5200 / $0.50
[COST] Budget exceeded after Agent 1. Saving partial results.
[Webhook] Slack notification sent successfully.
```

---

## Closing

**Talking point:** "We started with a 30-line single agent and ended with a production-hardened pipeline — PII protection, cost controls, webhook notifications — all built incrementally with Claude Code."

Suggested wrap-up questions:
- "What surprised you about the incremental approach?"
- "Which production concern would you prioritize first in your own projects?"
- "How would you extend this pipeline further? (approval gates, database storage, scheduling)"
