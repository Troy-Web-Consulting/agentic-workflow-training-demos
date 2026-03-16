# Phase 1: Core SDK Patterns (Steps 1-3)

Each prompt builds on the previous. Paste them into Claude Code sequentially.

**Sample documents are already in `samples/`** — do not recreate them.

**Key concepts:** `query()`, built-in tools, custom MCP tools, session `resume`

---

## Step 1 — Single Agent with Read Tool

### Prompt

```
Create a Content Summary Agent using the Claude Agent SDK (@anthropic-ai/claude-agent-sdk).

Set up the project:
- Initialize with npm, TypeScript, and tsx for execution
- Install @anthropic-ai/claude-agent-sdk and zod
- Create a tsconfig.json targeting ESNext with module NodeNext

Create a shared module `content_request.ts` with:
- A SYSTEM_PROMPT: "You are a content analysis specialist. Read documents and extract key information clearly and concisely. Use bullet points over paragraphs, skip filler, and aim for under 400 words."
- A READER_PROMPT: instructions to read a document, identify main topics, decisions, and action items, using the Read tool
- A `save()` function that logs text and appends to a buffer
- A `run()` function that wraps an async main, prints a header, and writes the buffer to an Outputs directory

Create `phase1/step1_content_reader.ts`:
- A single agent that uses query() with the built-in Read tool
- Accepts a file path as CLI arg, defaulting to `samples/meeting_notes.md`
- Streams the response and prints each text block
- Prints cost at the end
- Uses the shared SYSTEM_PROMPT + READER_PROMPT
- Set maxTurns to 3

Add npm scripts: "step1": "tsx phase1/step1_content_reader.ts"
```

### Expected Output (step1_output.md)

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

## Step 2 — Add a Custom MCP Tool

### Prompt

```
Now add a second step that introduces a custom tool.

Create `phase1/step2_analyzer.ts`:
- Same single-agent pattern as Step 1, but now with a custom MCP tool called `extract_structure`
- Use createSdkMcpServer and tool() from the SDK to define the tool
- The extract_structure tool:
  - Accepts a `raw_text` string parameter (validated with zod)
  - Logs that it was called with the input length
  - Returns instructions telling the agent to organize the text into three categories: key_points, action_items, and decisions
  - Returns the raw_text_length and a text_preview (first 500 chars)
- Wire the tool into an MCP server named "analyzer"
- Use allowedTools: ["Read", "mcp__analyzer__extract_structure"]
- Change the system prompt to use ANALYZER_PROMPT (add to content_request.ts): instructions to ALWAYS use extract_structure, read the doc first with Read, then use extract_structure on the raw text
- Set maxTurns to 5

Add npm script: "step2": "tsx phase1/step2_analyzer.ts"
```

### Expected Output (step2_output.md)

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

## Step 3 — Three Chained Agents

### Prompt

```
Now chain three agents together on a single session.

Create `phase1/step3_pipeline.ts`:
- Three query() calls using the `resume` option to share session context
- Agent 1 (Content Reader): reads the document and summarizes it using READER_PROMPT
- Agent 2 (Analyzer): resumes Agent 1's session, uses ANALYZER_PROMPT to call extract_structure on the content from above
- Agent 3 (Brief Writer): resumes the same session, uses WRITER_PROMPT to produce a final professional brief

Add WRITER_PROMPT to content_request.ts: "You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words."

Create a shared processMessage() helper that:
- Extracts and saves text blocks from assistant messages
- Logs tool use
- Prints cost from result messages
- Returns session_id from any message that has it

Capture session_id from Agent 1, pass it via `resume` to Agents 2 and 3.

Add npm script: "step3": "tsx phase1/step3_pipeline.ts"
```

### Expected Output (step3_output.md)

The output contains three sections concatenated — the reader summary, the structured extraction, then the final brief:

```markdown
[Agent 1 output — same as Step 1 summary]

[Agent 2 output — same as Step 2 structured extraction]

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
