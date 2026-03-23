# Content Summary Agent — Presentation Workflow

A centralized tracker for the live-coding presentation. Update this file as you progress through each phase.

---

## Phase 1: Core SDK Patterns

Build a Content Summary Agent that reads documents and produces structured briefs.

| Step | Concept | Prompt File | Status |
|------|---------|-------------|--------|
| 1 | Single agent + Read tool | `Prompts/Phase 1/prompt_1_content_reader.md` | Not started |
| 2 | Custom MCP tool (`extract_structure`) | `Prompts/Phase 1/prompt_2_content_analyzer.md` | Not started |
| 3 | Chained 3-agent pipeline with `resume` | `Prompts/Phase 1/prompt_3_agent_workflow.md` | Not started |

**Presenter guide:** `Prompts/Phase 1/overview.md`

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
| 4 | Slack webhook (code-driven) | `Prompts/Phase 2/prompt_1_slack_webhook.md` | Not started |
| 4b | Slack as agent-callable tool (Block Kit) | _live prompt during presentation_ | Not started |

**Presenter guide:** `Prompts/Phase 2/overview.md`

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
| 5 | PII sanitization | `Prompts/Phase 3/prompt_1_pii_sanitizer.md` | Not started |
| 6 | Budget/cost controls | `Prompts/Phase 3/prompt_2_budget_controls.md` | Not started |

**Presenter guide:** `Prompts/Phase 3/overview.md`

---

## Notes

_Use this section for live notes during the presentation._

