// Step 5: Pipeline with PII Sanitization + Webhook
// Same 3-agent pipeline, wrapped with PII pre/post processing.
// Inherits webhook from Phase 2 — Slack message notes if PII was redacted.

import {
  query,
  createSdkMcpServer,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import type { SDKAssistantMessage, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import fs from "node:fs";
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
import { sanitizeInput, sanitizeOutput, detectPII } from "./sanitizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ??
  "https://hooks.slack.com/services/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";

// -- Custom Tool --------------------------------------------------------------

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

// -- Helper -------------------------------------------------------------------

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
    : path.resolve(__dirname, "../samples/customer_feedback_report.md");

  // -- PRE-PROCESSING: Sanitize input before agents see it --------------------
  console.log("\n[Sanitizer] Reading and scanning input document...");
  const rawContent = fs.readFileSync(filePath, "utf-8");

  const piiFindings = detectPII(rawContent);
  if (piiFindings.length > 0) {
    console.log("[Sanitizer] PII detected in input:");
    for (const f of piiFindings) {
      console.log(`  - ${f.type}: ${f.count} occurrence(s)`);
    }
  } else {
    console.log("[Sanitizer] No PII patterns detected in input.");
  }

  const sanitizedContent = sanitizeInput(rawContent);
  console.log("[Sanitizer] Input sanitized. Passing to agent pipeline.\n");

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

  // -- Agent 1: Content Reader (sanitized input) ------------------------------
  console.log(">> Agent 1: Reading the document (sanitized)...\n");

  for await (const msg of query({
    prompt:
      READER_PROMPT +
      "\n\nHere is the document content (already loaded):\n\n" +
      sanitizedContent,
    options: baseOptions,
  })) {
    const sid = processMessage(msg, "Agent 1");
    if (sid) sessionId = sid;
  }

  // -- Agent 2: Analyzer ------------------------------------------------------
  console.log("\n>> Agent 2: Extracting structure...\n");

  for await (const msg of query({
    prompt:
      ANALYZER_PROMPT +
      "\n\nUse the extract_structure tool on the document content from above " +
      "to categorize it into key points, action items, and decisions.",
    options: { ...baseOptions, resume: sessionId },
  })) {
    processMessage(msg, "Agent 2");
  }

  // -- Agent 3: Brief Writer --------------------------------------------------
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
          console.log(block.text);
        }
      }
    } else if (msg.type === "result" && (msg as any).subtype === "success") {
      const result = msg as any;
      console.log(`\n── Agent 3 cost: $${result.total_cost_usd.toFixed(4)} ──`);
    }
  }

  // -- POST-PROCESSING: Sanitize output as a safety net -----------------------
  console.log("\n[Sanitizer] Scanning agent output for leaked PII...");

  const outputPII = detectPII(briefOutput);
  if (outputPII.length > 0) {
    console.log("[Sanitizer] PII found in output! Redacting:");
    for (const f of outputPII) {
      console.log(`  - ${f.type}: ${f.count} occurrence(s)`);
    }
    briefOutput = sanitizeOutput(briefOutput);
    console.log("[Sanitizer] Output sanitized.");
  } else {
    console.log("[Sanitizer] No PII leaked into output. All clear.");
  }

  save(briefOutput);

  // -- Webhook: Notify Slack --------------------------------------------------
  const piiNote =
    piiFindings.length > 0
      ? ` (${piiFindings.reduce((sum, f) => sum + f.count, 0)} PII items redacted)`
      : "";

  const sentences = briefOutput
    .replace(/#+\s.*\n/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 10)
    .slice(0, 2)
    .join(" ");

  const slackSummary =
    (sentences || "Analysis complete — see output for details.") + piiNote;
  await sendSlackNotification(slackSummary);
}

run(
  "STEP 5: Pipeline with PII Sanitization",
  main,
  "step5_output.md",
  "Pre/post processing hooks — sanitize PII before and after the agent pipeline"
);
