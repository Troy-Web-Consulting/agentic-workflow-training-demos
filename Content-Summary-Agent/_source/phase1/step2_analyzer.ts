// Step 2: Single Agent + Custom Tool
// Same agent as Step 1, but now wired to an MCP server with a custom tool.
// The agent reads the file AND uses extract_structure to categorize content.

import {
  query,
  createSdkMcpServer,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import type { SDKAssistantMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEM_PROMPT, ANALYZER_PROMPT, run, save } from "../content_request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// -- Custom Tool: extract_structure -------------------------------------------
// Accepts raw text and returns a structured JSON breakdown.

const extractStructure = tool(
  "extract_structure",
  "Extract structured information from raw text. Returns key points, action items, and decisions as categorized JSON.",
  {
    raw_text: z.string().describe("The raw document text to analyze and categorize"),
  },
  async (args) => {
    console.log("\n  >> extract_structure tool called");
    console.log(`  >> Input length: ${args.raw_text.length} chars\n`);

    // In a real system this could call an NLP service.
    // Here we return the text back for the agent to structure.
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

async function main() {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../samples/meeting_notes.md");

  // Wrap the custom tool in an MCP server
  const analyzerServer = createSdkMcpServer({
    name: "analyzer",
    tools: [extractStructure],
  });

  const prompt = `Read the document at ${filePath}, then use the extract_structure tool to categorize its contents.`;

  for await (const msg of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT + ANALYZER_PROMPT,
      mcpServers: { analyzer: analyzerServer },
      allowedTools: ["Read", "mcp__analyzer__extract_structure"],
      maxTurns: 5,
      env: { ...process.env, CLAUDECODE: undefined },
    },
  })) {
    if (msg.type === "assistant") {
      const assistantMsg = msg as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        if (block.type === "text") {
          save(block.text);
        } else if (block.type === "tool_use") {
          console.log(`\n  ── Tool: ${block.name}(${JSON.stringify(block.input).slice(0, 100)}...) ──\n`);
        }
      }
    } else if (msg.type === "result" && (msg as any).subtype === "success") {
      const result = msg as any;
      console.log(`\n── Cost: $${result.total_cost_usd.toFixed(4)} ──`);
    }
  }
}

run(
  "STEP 2: Single Agent + Structure Extraction Tool",
  main,
  "step2_output.md",
  "Adding a custom tool — the agent can now categorize content structurally"
);
