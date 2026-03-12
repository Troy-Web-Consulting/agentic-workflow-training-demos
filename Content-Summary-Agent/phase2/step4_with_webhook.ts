// Step 4: Pipeline with Slack Webhook Notification
// Takes the Phase 1 Step 3 pipeline (Reader -> Analyzer -> Writer) and adds
// a Slack webhook POST so participants see results in a shared channel.

import {
  query,
  createSdkMcpServer,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import type { SDKAssistantMessage, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYSTEM_PROMPT,
  READER_PROMPT,
  ANALYZER_PROMPT,
  WRITER_PROMPT,
  run,
  save,
} from "../content_request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ??
  "https://hooks.slack.com/services/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";

// -- Custom Tool (same as Phase 1) --------------------------------------------

const extractStructure = tool(
  "extract_structure",
  "Extract structured information from raw text. Returns key points, action items, and decisions as categorized JSON.",
  {
    raw_text: z.string().describe("The raw document text to analyze and categorize"),
  },
  async (args) => {
    console.log("\n  >> extract_structure tool called");
    console.log(`  >> Input length: ${args.raw_text.length} chars\n`);

    const result = {
      instructions:
        "Analyze the provided text and organize it into three categories: " +
        "key_points (important facts/updates), action_items (tasks with owners/deadlines), " +
        "and decisions (choices that were made). Return your analysis as structured text.",
      raw_text_length: args.raw_text.length,
      text_preview: args.raw_text.slice(0, 500) + "...",
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// -- Helper to process messages from a query ----------------------------------

function processMessage(msg: SDKMessage, agentLabel: string): string | null {
  if (msg.type === "assistant") {
    const assistantMsg = msg as SDKAssistantMessage;
    for (const block of assistantMsg.message.content) {
      if (block.type === "text") {
        save(block.text);
      } else if (block.type === "tool_use") {
        console.log(`\n  ── Tool: ${block.name}(...) ──\n`);
      }
    }
  } else if (msg.type === "result" && (msg as any).subtype === "success") {
    const result = msg as any;
    console.log(`\n── ${agentLabel} cost: $${result.total_cost_usd.toFixed(4)} ──`);
  }

  return (msg as any).session_id ?? null;
}

// -- Slack Webhook ------------------------------------------------------------

async function sendSlackNotification(summary: string): Promise<void> {
  console.log("\n[Webhook] Sending Slack notification...");

  const payload = {
    text: `📝 Content Summary Agent completed: ${summary}`,
  };

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    console.log("[Webhook] Slack notification sent successfully.");
  } else {
    console.log(`[Webhook] Slack returned ${response.status}: ${response.statusText}`);
  }
}

async function main() {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../samples/project_status.md");

  const analyzerServer = createSdkMcpServer({
    name: "analyzer",
    tools: [extractStructure],
  });

  const baseOptions = {
    systemPrompt: SYSTEM_PROMPT,
    mcpServers: { analyzer: analyzerServer },
    allowedTools: ["Read", "mcp__analyzer__extract_structure"],
    env: { ...process.env, CLAUDECODE: undefined },
    maxTurns: 5,
  };

  let sessionId = "";

  // -- Agent 1: Content Reader ------------------------------------------------
  console.log("\n>> Agent 1: Reading the document...\n");

  for await (const msg of query({
    prompt:
      READER_PROMPT +
      `\n\nRead and summarize the document at: ${filePath}`,
    options: baseOptions,
  })) {
    const sid = processMessage(msg, "Agent 1");
    if (sid) sessionId = sid;
  }

  // -- Agent 2: Analyzer (resumes Agent 1's session) --------------------------
  console.log("\n>> Agent 2: Extracting structure...\n");

  for await (const msg of query({
    prompt:
      ANALYZER_PROMPT +
      "\n\nNow use the extract_structure tool on the document content from above " +
      "to categorize it into key points, action items, and decisions.",
    options: { ...baseOptions, resume: sessionId },
  })) {
    processMessage(msg, "Agent 2");
  }

  // -- Agent 3: Brief Writer (resumes the same session) -----------------------
  console.log("\n>> Agent 3: Writing the brief...\n");

  let briefOutput = "";
  for await (const msg of query({
    prompt:
      WRITER_PROMPT +
      "\n\nUsing all the analysis from above, produce the final brief now.",
    options: { ...baseOptions, resume: sessionId },
  })) {
    if (msg.type === "assistant") {
      const assistantMsg = msg as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === "text") {
          briefOutput += block.text;
          save(block.text);
        } else if (block.type === "tool_use") {
          console.log(`\n  ── Tool: ${block.name}(...) ──\n`);
        }
      }
    } else if (msg.type === "result" && (msg as any).subtype === "success") {
      const result = msg as any;
      console.log(`\n── Agent 3 cost: $${result.total_cost_usd.toFixed(4)} ──`);
    }
  }

  // -- Webhook: Notify Slack --------------------------------------------------
  // Extract first 2-3 sentences from the brief for the Slack message
  const sentences = briefOutput
    .replace(/#+\s.*\n/g, "") // strip markdown headers
    .replace(/\n+/g, " ")     // collapse newlines
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 10)
    .slice(0, 3)
    .join(" ");

  const slackSummary = sentences || "Analysis complete — see output for details.";
  await sendSlackNotification(slackSummary);
}

run(
  "STEP 4: Pipeline with Slack Webhook",
  main,
  "step4_output.md",
  "Adding Slack webhook notification after the 3-agent pipeline"
);
