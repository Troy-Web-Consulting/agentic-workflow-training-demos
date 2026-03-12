# Content Summary Agent

A training demo that progressively builds a content analysis pipeline using the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). Participants follow along step-by-step, starting with a single agent and ending with a production-ready system.

## What It Does

Three agents work in a chain to analyze documents:

1. **Reader** — reads a document and produces a summary
2. **Analyzer** — uses a custom tool to extract structure (key points, action items, decisions)
3. **Writer** — produces a clean, professional brief from the analysis

Each phase layers on new capabilities without rewriting what came before.

## Phases

### Phase 1: Core SDK Patterns (Steps 1-3)

| Step | File | What's New |
|------|------|------------|
| 1 | `phase1/step1_content_reader.ts` | Single agent with the `Read` tool |
| 2 | `phase1/step2_analyzer.ts` | Adds a custom MCP tool (`extract_structure`) |
| 3 | `phase1/step3_pipeline.ts` | Three agents chained on one session via `resume` |

### Phase 2: Webhook Notification (Step 4)

| Step | File | What's New |
|------|------|------------|
| 4 | `phase2/step4_with_webhook.ts` | Posts a summary to Slack after pipeline completes |

### Phase 3: Production Hardening (Steps 5-8)

Each step adds one operational concern on top of the previous:

| Step | File | What's New |
|------|------|------------|
| 5 | `phase3/step5_sanitization.ts` | PII detection and redaction (input + output) |
| 6 | `phase3/step6_error_handling.ts` | Try/catch with graceful degradation per agent |
| 7 | `phase3/step7_logging.ts` | Structured `[HH:MM:SS] [LABEL]` logging |
| 8 | `phase3/step8_cost_controls.ts` | Budget tracking and enforcement across the pipeline |

Step 8 is the "final form" — the complete production-ready pipeline.

## Quick Start

```bash
npm install
npm run step1   # Single agent reads a document
npm run step3   # Full 3-agent pipeline
npm run step8   # Everything: sanitization, error handling, logging, cost controls, webhook
```

Run any step with `npm run step<N>`. Pass a custom file as a CLI argument:

```bash
npx tsx phase1/step1_content_reader.ts ./samples/project_status.md
```

## Slack Webhook

Steps 4-8 post a summary to the **#ai** Slack channel when the pipeline completes. The webhook URL is hardcoded for the training demo but can be overridden:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL npm run step4
```

## Sample Documents

| File | Used By | Description |
|------|---------|-------------|
| `samples/meeting_notes.md` | Steps 1-3 | Product team sync with decisions, action items, and tangents |
| `samples/project_status.md` | Step 4 | Weekly status update with team reports and blockers |
| `samples/customer_feedback_report.md` | Steps 5-8 | Support cases with embedded PII (emails, phones, SSN) |

## Shared Modules

| File | Purpose |
|------|---------|
| `content_request.ts` | Prompts, `save()`, and `run()` helpers used by all steps |
| `phase3/sanitizer.ts` | PII detection and redaction (email, phone, SSN regex) |
| `phase3/logger.ts` | Timestamped, labeled logging utility |

## Tech Stack

- **TypeScript** + **tsx** for execution
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) for agent orchestration
- **Zod** for custom tool input validation
- **Native `fetch()`** (Node 18+) for webhook — no HTTP dependencies
