# Phase 1: Core SDK Patterns — Presenter Guide

## What We're Building

A Content Summary Agent that reads documents and produces structured briefs. Phase 1 introduces three core SDK patterns across three prompts, building up additively: `content_request.ts` (shared module) evolves with each prompt, while each prompt creates a new focused file.

**Key concepts:** `query()`, built-in tools, custom MCP tools, session `resume`

**Sample documents are already in `samples/`** — do not recreate them.

---

## Timing Breakdown

| Segment | Duration | Cumulative |
|---------|----------|------------|
| Intro / context setting | 2-3 min | 2-3 min |
| Prompt 1: Setup + Reader Agent | 5-6 min | 7-9 min |
| Prompt 2: Content Analyzer | 5-6 min | 12-15 min |
| Prompt 3: Agent Workflow | 5-6 min | 17-21 min |
| Closing Q&A | 3-5 min | 20-26 min |

---

## Intro Talking Points (2-3 min)

- The Claude Agent SDK lets you build multi-agent workflows in TypeScript
- We're going to build a document summarization pipeline live using Claude Code
- Each prompt introduces 1-2 new concepts — we'll paste them in and watch Claude Code scaffold the code
- The code builds additively — each prompt either adds to `content_request.ts` or creates a new focused file
- By the end of Phase 1, we'll have three chained agents sharing a session

---

## Prompt 1 — Single Agent with Read Tool

**File:** `prompt_1_content_reader.md` (copy/paste entire file into Claude Code)

**Time target:** 5-6 min (including discussion)

**Concepts introduced:**
- Project scaffolding (npm, TypeScript, tsx)
- `query()` — the core SDK function for running an agent
- Built-in `Read` tool — lets the agent read files from disk
- `maxTurns` — limits how many tool-use loops the agent can take

**What to watch for while Claude Code executes:**
- It will create `package.json`, `tsconfig.json`, install dependencies
- `content_request.ts` is the shared module — point out the system prompt and the `run()` wrapper
- `content_reader.ts` is ~30 lines — highlight how little code is needed for a working agent
- The `query()` call with `allowedTools: ["Read"]` — this is the key SDK pattern

**Discussion points:**
- "Notice it only took one `query()` call and one tool to get a useful agent"
- "The system prompt shapes the output — bullet points, concise, under 400 words"
- "maxTurns: 3 is a safety net — the agent reads the file and responds in 1-2 turns"
- Ask: "What other built-in tools might be useful here?" (Write, Bash, etc.)

### Expected Output (Prompt 1)

```markdown
## Summary: Product Team Sync — March 10, 2026

**Attendees:** Sarah Chen (PM), John Rivera (Eng Lead), Priya Patel (Design), Marcus Thompson (QA), Lisa Wong (Marketing), David Kim (Backend Dev)

---

### Main Topics

- **Q2 Planning & Revenue** — Board meeting positive; revenue up **23% YoY**.
- **API Migration (REST -> GraphQL)** — Estimated **6-8 weeks**; risk around legacy payment service running on EOL Node 14. David is investigating the upgrade and needs coordination with Stripe.
- **New Dashboard Design** — Mockups reviewed and well-received. **Sidebar navigation (Option B)** selected. PDF export deferred to **V2** release. Concern noted about testability of dynamic filtering on the analytics page.
- **Regression Test Suite** — Currently takes **45 min** to run; parallelization approved for **Sprint 14** (2 sprint points).
- **Monitoring Tools** — Datadog vs. Grafana debated; **no decision made** — separate evaluation meeting to be scheduled.
- **Security Issue (P1)** — User session tokens not rotating properly (valid 30 days instead of 24 hours). Flagged as urgent.
- **Cloud Budget** — AWS run rate at **$47K/month**; target optimization to **$38K/month** via EC2 right-sizing and Lambda migration.
- **Marketing** — Recent API blog post hit **12K views**; technical deep-dive post requested from engineering.

---

### Decisions Made

- Sidebar navigation layout (Option B) for the dashboard
- PDF export pushed to V2, not V1
- Test parallelization prioritized in Sprint 14
- Session token bug classified as **P1 — fix ASAP**

---

### Action Items

| Owner | Task | Deadline |
|---|---|---|
| **John Rivera** | Reach out to Stripe developer relations | End of week |
| **David Kim** | File P1 ticket & deliver session token fix for code review | Wednesday |
| **Sarah Chen** | Prepare Q2 cloud cost analysis | Friday |
| **Priya Patel** | Write technical deep-dive blog post draft | March 20 |
| **John Rivera** | Schedule Datadog vs. Grafana evaluation meeting | TBD |

**Next meeting:** Thursday, same time.
```

---

## Prompt 2 — Content Analyzer (Custom MCP Tool)

**File:** `prompt_2_content_analyzer.md` (copy/paste entire file into Claude Code)

**Time target:** 5-6 min (including discussion)

**Concepts introduced:**
- `createSdkMcpServer` + `tool()` — defining custom MCP tools
- Tool parameters validated with Zod schemas
- `allowedTools` array — mixing built-in and custom tools

**What to watch for while Claude Code executes:**
- It creates a **new file** `content_analyzer.ts` — the reader stays untouched
- The `extract_structure` tool definition — show how `tool()` takes a name, description, schema, and handler
- The tool *returns instructions* to the agent — it's a prompt injection pattern, not a data transform
- `allowedTools` now includes both `"Read"` and `"mcp__analyzer__extract_structure"`
- `content_request.ts` gets the new ANALYZER_PROMPT added
- The `analyzerServer` is exported — it will be reused in Prompt 3

**Discussion points:**
- "The custom tool doesn't do heavy processing — it guides the agent's output structure"
- "This is a common pattern: tools as structured prompts, not just API calls"
- "The `mcp__<server>__<tool>` naming convention is how the SDK namespaces custom tools"
- Ask: "Where might you use this pattern in your own work?"

> **Running behind?** If you're past 15 min at this point, skip the discussion and move directly to Prompt 3. You can circle back to questions during closing Q&A.

### Expected Output (Prompt 2)

```markdown
Here is the structured extraction from the **Product Team Sync — March 10, 2026**:

---

## Key Points
- **Revenue** up **23% YoY** per last week's board meeting
- **API Migration:** Moving customer-facing endpoints from REST -> GraphQL; estimated **6-8 weeks**
- **Payment service risk:** Running on **Node 14 (EOL)**; David coordinating upgrade with Stripe
- **Dashboard mockups** presented by Priya — well received; concern flagged about dynamic filtering testability
- **Regression test suite** now takes **45 minutes**; needs parallelization
- **Security issue (P1):** Session tokens not rotating — valid for 30 days instead of 24 hours
- **AWS spend:** Current run rate **$47K/month**, potential to optimize to **$38K/month**
- **Marketing:** API blog post hit **12K views** last week

---

## Action Items
| Owner | Task | Deadline |
|---|---|---|
| **John Rivera** | Contact Stripe developer relations re: payment service | End of week |
| **John Rivera** | Schedule separate meeting to evaluate Datadog vs. Grafana | TBD |
| **David Kim** | File P1 ticket for session token rotation bug | ASAP |
| **David Kim** | Have token rotation fix ready for code review | **Wednesday** |
| **Sarah Chen** | Put together AWS cost optimization analysis | **Friday** |
| **Priya Patel** | Write technical deep-dive blog post | **March 20** |

---

## Decisions
- **PDF export** -> deferred to **V2** (not included in V1)
- **Navigation layout** -> **Option B (sidebar)** chosen over top nav
- **Test parallelization** -> prioritized for **Sprint 14** (2 sprint points allocated)
- **Session token bug** -> classified as **P1**, fix ASAP

---

**Next meeting:** Thursday, same time (2:00 PM).
```

---

## Prompt 3 — Three Chained Agents

**File:** `prompt_3_agent_workflow.md` (copy/paste entire file into Claude Code)

**Time target:** 5-6 min (including discussion)

**Concepts introduced:**
- Session `resume` — multiple agents sharing conversation context
- Agent chaining — output of one agent feeds into the next
- `processMessage()` helper — reusable message processing pattern

**What to watch for while Claude Code executes:**
- It creates a **new file** `workflow.ts` — the orchestrator that chains all three agents
- `workflow.ts` imports `analyzerServer` from `content_analyzer.ts` — reusing the MCP server from Prompt 2
- `session_id` captured from Agent 1's response, passed to Agents 2 and 3 via `resume`
- The `processMessage()` helper gets added to `content_request.ts` — show how it extracts text, logs tool use, and tracks cost
- WRITER_PROMPT also gets added to `content_request.ts`
- The final brief combines work from all three agents without re-reading the document

**Discussion points:**
- "Each agent has a focused role — reader, analyzer, writer. The session ties them together."
- "Agent 3 never reads the file — it works entirely from the session context built by Agents 1 and 2"
- "This is the core pattern for multi-agent workflows: chain agents on a shared session"
- Ask: "What other pipelines could you build with this pattern?"

### Expected Output (Prompt 3)

The output contains three sections concatenated — the reader summary, the structured extraction, then the final brief:

```markdown
[Agent 1 output — same as Prompt 1 summary]

[Agent 2 output — same as Prompt 2 structured extraction]

---

# Product Team Sync — Brief
**Date:** March 10, 2026 | **Time:** 2:03-3:15 PM
**Attendees:** Sarah Chen (PM), John Rivera (Eng Lead), Priya Patel (Design), Marcus Thompson (QA), Lisa Wong (Marketing), David Kim (Backend Dev)

---

## Summary

The product team conducted its regular sync covering Q2 planning, an in-progress API migration, new dashboard designs, test infrastructure performance, a critical security vulnerability, cloud cost optimization, and marketing content plans. Revenue is trending positively at 23% YoY. A P1 security issue involving session token expiration was escalated for immediate resolution. Four key decisions were finalized, and six action items were assigned with near-term deadlines.

---

## Key Points

- **Revenue** is up **23% YoY** per last week's board meeting.
- **API migration** (REST -> GraphQL) is underway with a **6-8 week** timeline; the legacy payment service running on **Node 14 (EOL)** poses the primary risk.
- **Dashboard redesign** mockups were presented and positively received; testability of dynamic filtering flagged as a QA concern.
- **Regression test suite** has degraded to **45-minute** run times and requires parallelization.
- **Monitoring tooling** (Datadog vs. Grafana) was discussed without resolution; a dedicated evaluation session will follow.
- **Security vulnerability (P1):** User session tokens persist for **30 days** instead of the required **24 hours**.
- **AWS infrastructure** costs are **$47K/month**; optimization target of **$38K/month** identified.
- **Marketing:** API blog post earned **12K views**; a follow-up technical deep-dive is planned.

---

## Action Items

| # | Owner | Task | Deadline |
|---|-------|------|----------|
| 1 | John Rivera | Contact Stripe developer relations re: payment service coordination | End of week |
| 2 | John Rivera | Schedule dedicated Datadog vs. Grafana evaluation meeting | TBD |
| 3 | David Kim | File P1 ticket for session token rotation bug | Immediate |
| 4 | David Kim | Deliver token rotation fix for code review | Wed, Mar 11 |
| 5 | Sarah Chen | Prepare Q2 cloud cost optimization analysis | Fri, Mar 13 |
| 6 | Priya Patel | Draft technical deep-dive blog post | Fri, Mar 20 |

---

## Decisions

| # | Decision | Details |
|---|----------|---------|
| 1 | PDF export deferred to V2 | Report export feature excluded from V1 scope. |
| 2 | Sidebar navigation adopted | Option B (sidebar) selected over top navigation. |
| 3 | Test parallelization in Sprint 14 | 2 sprint points allocated to address suite performance. |
| 4 | Session token bug classified P1 | Fix required immediately; no release until resolved. |

---

**Next Sync:** Thursday, March 12, 2026 — same time.
```

---

## Optional: Prompt 4 — Reusability Demo (only if time permits)

If you finish Prompt 3 with 5+ minutes remaining, demonstrate reusability by re-running the pipeline on a different document:

```
Run the content reader on samples/project_status.md instead of the default meeting notes.
```

**Talking point:** "Same pipeline, different document — no code changes needed. This is the payoff of parameterizing the file path as a CLI arg."

---

## Closing Q&A (3-5 min)

Suggested questions to prompt discussion:

- "What surprised you about how little code was needed?"
- "Where do you see agent chaining being useful in your workflows?"
- "What would you add to this pipeline? (e.g., Slack notifications, database storage, approval steps)"

**Transition to Phase 2:** "In Phase 2, we'll add a Slack webhook notification — a real-world side effect that shows how to integrate external services into the pipeline."
