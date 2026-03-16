// Step 1: Single Agent — Content Reader
// One query() call with the Read built-in tool.
// The agent reads a document file and produces a summary.

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKAssistantMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEM_PROMPT, READER_PROMPT, run, save } from "../content_request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Accept a file path as CLI arg, default to meeting_notes.md
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../samples/meeting_notes.md");

  const prompt = `Read the document at ${filePath} and summarize it.`;

  // Stream the response and print each text block as it arrives.
  for await (const msg of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT + READER_PROMPT,
      allowedTools: ["Read"],
      maxTurns: 3,
      env: { ...process.env, CLAUDECODE: undefined },
    },
  })) {
    if (msg.type === "assistant") {
      const assistantMsg = msg as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === "text") {
          save(block.text);
        }
      }
    } else if (msg.type === "result" && (msg as SDKResultMessage as any).subtype === "success") {
      const result = msg as SDKResultMessage & { subtype: "success"; total_cost_usd: number };
      console.log(`\n── Cost: $${result.total_cost_usd.toFixed(4)} ──`);
    }
  }
}

run(
  "STEP 1: Single Agent — Content Reader",
  main,
  "step1_output.md",
  "A single agent with the Read tool — reads a file and summarizes it"
);
