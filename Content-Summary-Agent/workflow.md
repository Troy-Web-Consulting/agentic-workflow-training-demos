# Content Summary Agent — Presentation Workflow

A centralized tracker for the live-coding presentation. Update this file as you progress through each phase.

---

## Phase 1: Core SDK Patterns

Build a Content Summary Agent that reads documents and produces structured briefs.

| Step | Concept | Prompt File | Status |
|------|---------|-------------|--------|
| 1 | Single agent + Read tool | `Prompts/Phase 1/prompt_1_reader_agent.md` | Not started |
| 2 | Custom MCP tool (`extract_structure`) | `Prompts/Phase 1/prompt_2_custom_tool.md` | Not started |
| 3 | Chained 3-agent pipeline with `resume` | `Prompts/Phase 1/prompt_3_chained_pipeline.md` | Not started |

**Files created/modified:** `content_request.ts`, `content_reader.ts`

**Run:** `npm start` (or `npm start -- samples/project_status.md`)

### Key Talking Points
- `query()` is the core SDK function — one call per agent
- Built-in `Read` tool lets the agent read files from disk
- Custom MCP tools use `createSdkMcpServer` + `tool()` with zod schemas
- `resume` shares session context across agents — no manual state passing

---

## Phase 2: Slack Integration

Add a real-world side effect: posting results to Slack.

| Step | Concept | Prompt File | Status |
|------|---------|-------------|--------|
| 4 | Slack webhook (code-driven) | `Prompts/prompts_phase_2.md` — Step 4 | Not started |
| 4b | Slack as agent-callable tool (Block Kit) | `Prompts/prompts_phase_2.md` — Step 4b | Not started |

**Files created:** `phase2/step4_with_webhook.ts`, `phase2/step4b_slack_tool.ts`

**Run:** `npm run step4` / `npm run step4b`

### Key Talking Points
- **Step 4 vs 4b shift:** In Step 4 your code calls Slack after the pipeline. In Step 4b the agent has a tool and decides to call Slack itself.
- The agent must organize its output to match the tool's structured input schema (title, summary, key_points, action_items)
- Block Kit payload is regular code — the tool bridges agent intelligence with rich formatting
- Compare the two Slack messages: plain text (Step 4) vs Block Kit (Step 4b)

---

## Phase 3: Production Hardening

Add operational concerns one layer at a time.

| Step | Concept | Prompt File | Status |
|------|---------|-------------|--------|
| 5 | PII sanitization | `Prompts/prompts_phase_3.md` — Step 5 | Not started |
| 6 | Error handling + graceful degradation | `Prompts/prompts_phase_3.md` — Step 6 | Not started |
| 7 | Structured logging | `Prompts/prompts_phase_3.md` — Step 7 | Not started |
| 8 | Cost/budget controls | `Prompts/prompts_phase_3.md` — Step 8 | Not started |

---

## Notes

_Use this section for live notes during the presentation._

