# Phase 3: Production Hardening (Steps 5-8)

Each step adds one operational concern on top of the previous. By Step 8 you have the complete production-ready pipeline.

**Prerequisite:** Phase 1 + Phase 2 complete.

**Key concepts:** PII sanitization, graceful degradation, structured logging, budget enforcement.

---

## Step 5 — PII Sanitization

### Prompt

```
Add PII detection and redaction to the pipeline.

Create `phase3/sanitizer.ts` with three exported functions:
- sanitizeInput(text): replaces emails, phone numbers, and SSNs with tagged placeholders like [EMAIL_REDACTED], [PHONE_REDACTED], [SSN_REDACTED] using regex
- sanitizeOutput(text): same redaction applied to agent output as a safety net
- detectPII(text): returns an array of { type, count } findings for logging/audit

Regex patterns:
- Email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
- Phone: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
- SSN: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g

Create `phase3/step5_sanitization.ts`:
- Same 3-agent pipeline + webhook from Step 4
- PRE-PROCESSING: Before agents run, read the file, call detectPII() to log findings, then sanitizeInput() the content
- Pass the sanitized content directly in the prompt (instead of having the agent use Read)
- POST-PROCESSING: After Agent 3, call detectPII() on the output, and if any PII leaked through, call sanitizeOutput()
- Slack message includes a note about how many PII items were redacted
- Default input: samples/customer_feedback_report.md

Add npm script: "step5": "tsx phase3/step5_sanitization.ts"
```

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

### Expected Output (step5_output.md)

Same brief structure as Step 4, but with all PII replaced:

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

## Step 6 — Error Handling

### Prompt

```
Add graceful error handling to the pipeline.

Create `phase3/step6_error_handling.ts`:
- Same pipeline as Step 5 (sanitization + webhook)
- Wrap each agent's query() loop in a try/catch
- Error handling strategy:
  - Agent 1 (Reader) failure: ABORT the entire pipeline — can't continue without content. Send a Slack notification that it failed.
  - Agent 2 (Analyzer) failure: LOG the error, set a flag (analyzerSucceeded = false), and SKIP to Agent 3. The Writer can still produce a brief from just the Reader output.
  - Agent 3 (Writer) failure: LOG the error, fall back to saving the raw Reader output (or sanitized input) as the result.
- When Analyzer failed, adjust the Writer prompt to note: "The analyzer was unavailable. Using only the reader summary above, produce the best brief you can."

Add npm script: "step6": "tsx phase3/step6_error_handling.ts"
```

### Expected Output

Same as Step 5 when everything succeeds. When Agent 2 fails:

```
>> Agent 1: Reading the document (sanitized)...
[Reader output produced]

>> Agent 2: Extracting structure...
[ERROR] Agent 2 (Analyzer) failed: <error message>
[ERROR] Skipping to Brief Writer with Reader output only.

>> Agent 3: Writing the brief...
[Brief produced using only Reader context — still functional, slightly less structured]
```

---

## Step 7 — Structured Logging

### Prompt

```
Add structured timestamped logging.

Create `phase3/logger.ts`:
- Export a log(label, message) function
- Format: [HH:MM:SS] [LABEL] message
- Labels used: PIPELINE, SANITIZER, AGENT, COST, WEBHOOK, ERROR

Create `phase3/step7_logging.ts`:
- Same pipeline as Step 6 (sanitization + error handling + webhook)
- Replace all console.log calls with log() using appropriate labels
- Log pipeline start/end, each agent start, tool calls, costs, sanitizer actions, and webhook status

Add npm script: "step7": "tsx phase3/step7_logging.ts"
```

### Expected Console Output

```
[14:32:01] [SANITIZER] Reading and scanning input document...
[14:32:01] [SANITIZER] PII detected in input:
[14:32:01] [SANITIZER]   - email: 8 occurrence(s)
[14:32:01] [SANITIZER]   - phone: 7 occurrence(s)
[14:32:01] [SANITIZER]   - ssn: 1 occurrence(s)
[14:32:01] [SANITIZER] Input sanitized. Passing to agent pipeline.
[14:32:01] [PIPELINE] Agent 1: Reading the document (sanitized)...
[14:32:08] [COST] Agent 1 cost: $0.0142 | cumulative: $0.0142 / $0.50
[14:32:08] [PIPELINE] Agent 2: Extracting structure...
[14:32:09] [AGENT] extract_structure tool called (2847 chars)
[14:32:14] [COST] Agent 2 cost: $0.0198 | cumulative: $0.0340 / $0.50
[14:32:14] [PIPELINE] Agent 3: Writing the brief...
[14:32:21] [COST] Agent 3 cost: $0.0156 | cumulative: $0.0496 / $0.50
[14:32:21] [SANITIZER] Scanning agent output for leaked PII...
[14:32:21] [SANITIZER] No PII leaked into output. All clear.
[14:32:21] [WEBHOOK] Sending Slack notification...
[14:32:22] [WEBHOOK] Slack notification sent successfully.
[14:32:22] [PIPELINE] Pipeline complete. Total cost: $0.0496
```

---

## Step 8 — Cost Controls (Final Form)

### Prompt

```
Add budget tracking and enforcement. This is the "final form" — the complete production-ready pipeline.

Create `phase3/step8_cost_controls.ts`:
- Same pipeline as Step 7 (sanitization + error handling + logging + webhook)
- Add a MAX_BUDGET_USD constant (default: $0.50)
- Track cumulative cost across all agents using a cumulativeCostUsd variable
- After each agent's result message, add the agent's cost to the cumulative total
- Log cost after each agent: "[COST] Agent N cost: $X.XXXX | cumulative: $X.XXXX / $0.50"
- Budget check after Agent 1: if over budget, save partial results (reader output only), send Slack notification about early stop, and return
- Budget check after Agent 2: same pattern
- Slack notification at the end includes the total cost
- Log at pipeline start: "[COST] Budget: $0.50"

Add npm script: "step8": "tsx phase3/step8_cost_controls.ts"
```

### Expected Console Output (normal run, within budget)

```
[14:32:01] [COST] Budget: $0.50
[14:32:01] [SANITIZER] Reading and scanning input document...
[14:32:01] [SANITIZER] PII detected in input:
[14:32:01] [SANITIZER]   - email: 8 occurrence(s)
[14:32:01] [SANITIZER]   - phone: 7 occurrence(s)
[14:32:01] [SANITIZER]   - ssn: 1 occurrence(s)
[14:32:01] [SANITIZER] Input sanitized. Passing to agent pipeline.
[14:32:01] [PIPELINE] Agent 1: Reading the document (sanitized)...
[14:32:08] [COST] Agent 1 cost: $0.0142 | cumulative: $0.0142 / $0.50
[14:32:08] [PIPELINE] Agent 2: Extracting structure...
[14:32:09] [AGENT] extract_structure tool called (2847 chars)
[14:32:14] [COST] Agent 2 cost: $0.0198 | cumulative: $0.0340 / $0.50
[14:32:14] [PIPELINE] Agent 3: Writing the brief...
[14:32:21] [COST] Agent 3 cost: $0.0156 | cumulative: $0.0496 / $0.50
[14:32:21] [SANITIZER] Scanning agent output for leaked PII...
[14:32:21] [SANITIZER] No PII leaked into output. All clear.
[14:32:21] [WEBHOOK] Sending Slack notification...
[14:32:22] [WEBHOOK] Slack notification sent successfully.
[14:32:22] [PIPELINE] Pipeline complete. Total cost: $0.0496
```

### Expected Console Output (budget exceeded after Agent 1)

```
[14:32:01] [COST] Budget: $0.50
[14:32:01] [SANITIZER] Input sanitized. Passing to agent pipeline.
[14:32:01] [PIPELINE] Agent 1: Reading the document (sanitized)...
[14:32:08] [COST] Agent 1 cost: $0.5200 | cumulative: $0.5200 / $0.50
[14:32:08] [COST] Budget exceeded after Agent 1 ($0.5200 >= $0.50). Saving partial results.
[14:32:08] [WEBHOOK] Sending Slack notification...
[14:32:09] [WEBHOOK] Slack notification sent successfully.
```
