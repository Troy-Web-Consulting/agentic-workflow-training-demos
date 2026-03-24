# Phase 1: Building a Content Summary Agent — Live Walkthrough

## What We're Building

A document summarization pipeline using the Claude Agent SDK. We'll paste 3 prompts into Claude Code, each one building on the last, and end up with a multi-agent workflow that reads a document, extracts structure, and writes a professional brief.

No code to write by hand — Claude Code scaffolds everything from the prompts.

---

## Before You Start

Make sure you have:
- [ ] Node.js installed (`node -v`)
- [ ] Claude Code installed and authenticated
- [ ] An **Anthropic API key** set in your environment (see below)
- [ ] This repo cloned and open in your terminal

### API Key Setup

The Claude Agent SDK requires an **Anthropic API key** — a Claude Code / Claude Max subscription alone is not enough. Get a key from [platform.claude.com](https://platform.claude.com/) and set it in your terminal before running anything:

```bash
# macOS / Linux
export ANTHROPIC_API_KEY=your-api-key

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your-api-key"
```

Navigate to the project folder:
```bash
cd Content-Summary-Agent
```

---

## Step 1: Review the Sample Documents

Before writing any code, take a look at what's in the `Samples/` folder. These are the documents our agents will process — realistic examples with different structures and content types.

| File | What it is |
|------|-----------|
| `meeting_notes.md` | Product team sync — topics, decisions, action items (default input) |
| `customer_feedback_report.md` | Support escalations, NPS survey data, cross-team action items |
| `project_status.md` | Weekly status update with contacts and timelines |

Open one or two and skim them. Notice how they're unstructured — our pipeline will turn these into clean, organized briefs.

```bash
# Take a look at the default input document
cat Samples/meeting_notes.md
```

These are pre-populated — you don't need to create anything.

---

## Step 2: Your First Agent (Content Reader)

**What it does:** Creates a single agent that reads a document and summarizes it.

1. Open `Prompts/Phase 1/prompt_1_content_reader.md`
2. Copy the **entire file contents**
3. Paste into Claude Code
4. Watch it scaffold the project — `package.json`, `tsconfig.json`, dependencies, and two `.ts` files

**What gets created:**
- `content_request.ts` — shared module (system prompt, helper functions)
- `content_reader.ts` — the agent (~30 lines)

**Run it:**
```bash
npm install
npm run read
```

**What to notice:**
- One `query()` call + one built-in tool (`Read`) = a working agent
- The system prompt controls output format (bullet points, concise, <400 words)
- `maxTurns: 3` limits how many tool-use loops the agent can take

---

## Step 3: Adding a Custom Tool (Content Analyzer)

**What it does:** Adds a custom MCP tool that guides the agent to organize information into key_points, action_items, and decisions.

1. Open `Prompts/Phase 1/prompt_2_content_analyzer.md`
2. Copy the **entire file contents**
3. Paste into Claude Code

**What gets created:**
- `content_analyzer.ts` — new file with the custom tool + agent
- `content_request.ts` — updated with a new `ANALYZER_PROMPT`

**Run it:**
```bash
npm run analyze
```

**What to notice:**
- `createSdkMcpServer` + `tool()` define custom tools with validated inputs (Zod schemas)
- The custom tool returns *instructions* to the agent — it's a prompt, not a data transform
- `allowedTools` mixes built-in and custom: `["Read", "mcp__analyzer__extract_structure"]`
- The `mcp__<server>__<tool>` naming convention is how the SDK namespaces custom tools

---

## Step 4: Chaining Three Agents (Workflow)

**What it does:** Creates an orchestrator that chains all three agents on a shared session — reader, analyzer, and writer.

1. Open `Prompts/Phase 1/prompt_3_agent_workflow.md`
2. Copy the **entire file contents**
3. Paste into Claude Code

**What gets created:**
- `workflow.ts` — the orchestrator that chains 3 agents
- `content_request.ts` — updated with `WRITER_PROMPT` and a `processMessage()` helper

**Run it:**
```bash
npm start
```

**What to notice:**
- `session_id` is captured from Agent 1 and passed to Agents 2 and 3 via `resume`
- Agent 3 (the writer) never reads the file — it works entirely from shared session context
- Each agent has a focused role: read, analyze, write
- The output is a clean, professional brief combining work from all three agents

---

## Bonus: Try a Different Document

Same pipeline, different input — no code changes needed:

```bash
npm start -- Samples/project_status.md
npm start -- Samples/customer_feedback_report.md
```

---

## Quick Reference

| Command | What it runs | From prompt |
|---------|-------------|-------------|
| `npm run read` | Single reader agent | Prompt 1 |
| `npm run analyze` | Reader + custom MCP tool | Prompt 2 |
| `npm start` | Full 3-agent workflow | Prompt 3 |

---

## Key Concepts Introduced

| Concept | Where | Why it matters |
|---------|-------|---------------|
| `query()` | Prompt 1 | Core SDK function — runs an agent |
| Built-in tools (`Read`) | Prompt 1 | Agents can interact with the filesystem |
| `maxTurns` | Prompt 1 | Safety net — limits tool-use loops |
| `createSdkMcpServer` / `tool()` | Prompt 2 | Define custom tools with validated schemas |
| `allowedTools` | Prompts 1-3 | Controls which tools each agent can access |
| Session `resume` | Prompt 3 | Multiple agents share conversation context |
| Agent chaining | Prompt 3 | Output of one agent feeds into the next |

---

## Check Your Outputs

After running each step, take a look at what was produced. The `run()` helper writes agent output to the `Outputs/` directory — open the files there to see the final results alongside what was printed to the console. Comparing outputs across steps shows how each agent layer adds structure and polish to the same source document.
