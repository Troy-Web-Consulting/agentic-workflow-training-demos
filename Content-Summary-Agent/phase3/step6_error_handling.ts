// Step 6: Pipeline with Error Handling
// Builds on Step 5 (sanitization + webhook).
// Adds try/catch and graceful degradation around each agent call.

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

  try {
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
  } catch (err) {
    console.log(`[Webhook] Failed to send notification: ${err}`);
  }
}

async function main() {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../samples/customer_feedback_report.md");

  // -- PRE-PROCESSING: Sanitize input -----------------------------------------
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
  let readerOutput = "";
  let briefOutput = "";

  // -- Agent 1: Content Reader ------------------------------------------------
  console.log(">> Agent 1: Reading the document (sanitized)...\n");

  try {
    for await (const msg of query({
      prompt:
        READER_PROMPT +
        "\n\nHere is the document content (already loaded):\n\n" +
        sanitizedContent,
      options: baseOptions,
    })) {
      const sid = processMessage(msg, "Agent 1");
      if (sid) sessionId = sid;
      if (msg.type === "assistant") {
        const assistantMsg = msg as SDKAssistantMessage;
        for (const block of assistantMsg.message.content) {
          if (block.type === "text") readerOutput += block.text;
        }
      }
    }
  } catch (err) {
    // Reader fails → abort entirely, no content to work with
    console.error(`\n[ERROR] Agent 1 (Reader) failed: ${err}`);
    console.error("[ERROR] Cannot continue without content. Aborting pipeline.");
    await sendSlackNotification("Pipeline failed — Reader agent could not process the document.");
    return;
  }

  // -- Agent 2: Analyzer ------------------------------------------------------
  console.log("\n>> Agent 2: Extracting structure...\n");

  let analyzerSucceeded = true;
  try {
    for await (const msg of query({
      prompt:
        ANALYZER_PROMPT +
        "\n\nUse the extract_structure tool on the document content from above " +
        "to categorize it into key points, action items, and decisions.",
      options: { ...baseOptions, resume: sessionId },
    })) {
      processMessage(msg, "Agent 2");
    }
  } catch (err) {
    // Analyzer fails → skip to Agent 3 with just Reader output
    console.error(`\n[ERROR] Agent 2 (Analyzer) failed: ${err}`);
    console.error("[ERROR] Skipping to Brief Writer with Reader output only.");
    analyzerSucceeded = false;
  }

  // -- Agent 3: Brief Writer --------------------------------------------------
  console.log("\n>> Agent 3: Writing the brief...\n");

  try {
    const writerPrompt = analyzerSucceeded
      ? WRITER_PROMPT +
        "\n\nUsing all the analysis from above, produce the final brief now."
      : WRITER_PROMPT +
        "\n\nThe analyzer was unavailable. Using only the reader summary above, " +
        "produce the best brief you can.";

    for await (const msg of query({
      prompt: writerPrompt,
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
  } catch (err) {
    // Writer fails → save raw analysis as output
    console.error(`\n[ERROR] Agent 3 (Writer) failed: ${err}`);
    console.error("[ERROR] Saving raw reader output as fallback.");
    briefOutput = readerOutput || sanitizedContent;
  }

  // -- POST-PROCESSING: Sanitize output ---------------------------------------
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

  // -- Webhook ----------------------------------------------------------------
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
  "STEP 6: Pipeline with Error Handling",
  main,
  "step6_output.md",
  "Try/catch and graceful degradation around each agent call"
);
