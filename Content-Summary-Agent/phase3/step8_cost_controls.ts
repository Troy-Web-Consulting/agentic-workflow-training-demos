// Step 8: Full Production Pipeline with Cost Controls
// The "final form" — builds on Step 7 with budget tracking and enforcement.
// Sanitization + error handling + structured logging + webhook + cost controls.

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
import { log } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ??
  "https://hooks.slack.com/services/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";

const MAX_BUDGET_USD = 0.50;

// -- Custom Tool --------------------------------------------------------------

const extractStructure = tool(
  "extract_structure",
  "Extract structured information from raw text. Returns key points, action items, and decisions as categorized JSON.",
  {
    raw_text: z.string().describe("The raw document text to analyze and categorize"),
  },
  async (args) => {
    log("AGENT", `extract_structure tool called (${args.raw_text.length} chars)`);

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

let cumulativeCostUsd = 0;

function processMessage(msg: SDKMessage, agentLabel: string): string | null {
  if (msg.type === "assistant") {
    const assistantMsg = msg as SDKAssistantMessage;
    for (const block of assistantMsg.message.content) {
      if (block.type === "text") {
        save(block.text);
      } else if (block.type === "tool_use") {
        log("AGENT", `${agentLabel} calling tool: ${block.name}`);
      }
    }
  } else if (msg.type === "result" && (msg as any).subtype === "success") {
    const result = msg as any;
    const agentCost = result.total_cost_usd;
    cumulativeCostUsd += agentCost;
    log("COST", `${agentLabel} cost: $${agentCost.toFixed(4)} | cumulative: $${cumulativeCostUsd.toFixed(4)} / $${MAX_BUDGET_USD.toFixed(2)}`);
  }
  return (msg as any).session_id ?? null;
}

// -- Slack Webhook ------------------------------------------------------------

async function sendSlackNotification(summary: string): Promise<void> {
  log("WEBHOOK", "Sending Slack notification...");

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
      log("WEBHOOK", "Slack notification sent successfully.");
    } else {
      log("WEBHOOK", `Slack returned ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    log("ERROR", `Webhook failed: ${err}`);
  }
}

async function main() {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../samples/customer_feedback_report.md");

  // -- PRE-PROCESSING: Sanitize input -----------------------------------------
  log("SANITIZER", "Reading and scanning input document...");
  const rawContent = fs.readFileSync(filePath, "utf-8");

  const piiFindings = detectPII(rawContent);
  if (piiFindings.length > 0) {
    log("SANITIZER", "PII detected in input:");
    for (const f of piiFindings) {
      log("SANITIZER", `  - ${f.type}: ${f.count} occurrence(s)`);
    }
  } else {
    log("SANITIZER", "No PII patterns detected in input.");
  }

  const sanitizedContent = sanitizeInput(rawContent);
  log("SANITIZER", "Input sanitized. Passing to agent pipeline.");

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
  cumulativeCostUsd = 0;

  log("COST", `Budget: $${MAX_BUDGET_USD.toFixed(2)}`);

  // -- Agent 1: Content Reader ------------------------------------------------
  log("PIPELINE", "Agent 1: Reading the document (sanitized)...");

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
    log("ERROR", `Agent 1 (Reader) failed: ${err}`);
    log("ERROR", "Cannot continue without content. Aborting pipeline.");
    await sendSlackNotification("Pipeline failed — Reader agent could not process the document.");
    return;
  }

  // -- Budget check after Agent 1 ---------------------------------------------
  if (cumulativeCostUsd >= MAX_BUDGET_USD) {
    log("COST", `Budget exceeded after Agent 1 ($${cumulativeCostUsd.toFixed(4)} >= $${MAX_BUDGET_USD.toFixed(2)}). Saving partial results.`);
    briefOutput = readerOutput;
    save(briefOutput);
    await sendSlackNotification(
      `Pipeline stopped early (budget: $${cumulativeCostUsd.toFixed(4)}/$${MAX_BUDGET_USD.toFixed(2)}). Partial results saved.`
    );
    return;
  }

  // -- Agent 2: Analyzer ------------------------------------------------------
  log("PIPELINE", "Agent 2: Extracting structure...");

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
    log("ERROR", `Agent 2 (Analyzer) failed: ${err}`);
    log("ERROR", "Skipping to Brief Writer with Reader output only.");
    analyzerSucceeded = false;
  }

  // -- Budget check after Agent 2 ---------------------------------------------
  if (cumulativeCostUsd >= MAX_BUDGET_USD) {
    log("COST", `Budget exceeded after Agent 2 ($${cumulativeCostUsd.toFixed(4)} >= $${MAX_BUDGET_USD.toFixed(2)}). Saving partial results.`);
    briefOutput = readerOutput;
    save(briefOutput);
    await sendSlackNotification(
      `Pipeline stopped early (budget: $${cumulativeCostUsd.toFixed(4)}/$${MAX_BUDGET_USD.toFixed(2)}). Partial results saved.`
    );
    return;
  }

  // -- Agent 3: Brief Writer --------------------------------------------------
  log("PIPELINE", "Agent 3: Writing the brief...");

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
        const agentCost = result.total_cost_usd;
        cumulativeCostUsd += agentCost;
        log("COST", `Agent 3 cost: $${agentCost.toFixed(4)} | cumulative: $${cumulativeCostUsd.toFixed(4)} / $${MAX_BUDGET_USD.toFixed(2)}`);
      }
    }
  } catch (err) {
    log("ERROR", `Agent 3 (Writer) failed: ${err}`);
    log("ERROR", "Saving raw reader output as fallback.");
    briefOutput = readerOutput || sanitizedContent;
  }

  // -- POST-PROCESSING: Sanitize output ---------------------------------------
  log("SANITIZER", "Scanning agent output for leaked PII...");

  const outputPII = detectPII(briefOutput);
  if (outputPII.length > 0) {
    log("SANITIZER", "PII found in output! Redacting:");
    for (const f of outputPII) {
      log("SANITIZER", `  - ${f.type}: ${f.count} occurrence(s)`);
    }
    briefOutput = sanitizeOutput(briefOutput);
    log("SANITIZER", "Output sanitized.");
  } else {
    log("SANITIZER", "No PII leaked into output. All clear.");
  }

  save(briefOutput);

  // -- Webhook ----------------------------------------------------------------
  const piiCount = piiFindings.reduce((sum, f) => sum + f.count, 0);
  const piiNote = piiCount > 0 ? ` | ${piiCount} PII items redacted` : "";

  const sentences = briefOutput
    .replace(/#+\s.*\n/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 10)
    .slice(0, 2)
    .join(" ");

  const slackSummary =
    (sentences || "Analysis complete — see output for details.") +
    ` | Cost: $${cumulativeCostUsd.toFixed(4)}` +
    piiNote;
  await sendSlackNotification(slackSummary);

  log("PIPELINE", `Pipeline complete. Total cost: $${cumulativeCostUsd.toFixed(4)}`);
}

run(
  "STEP 8: Full Production Pipeline with Cost Controls",
  main,
  "step8_output.md",
  "Budget tracking and enforcement — the complete production-ready pipeline"
);
