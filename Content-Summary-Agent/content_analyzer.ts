import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { SYSTEM_PROMPT, ANALYZER_PROMPT, save, run } from "./content_request.js";

const extractStructureTool = tool(
  "extract_structure",
  "Extract structured information from raw text, organizing it into key_points, action_items, and decisions.",
  { raw_text: z.string().describe("The raw text to analyze") },
  async (args) => {
    console.log(`  [extract_structure] Called with ${args.raw_text.length} chars`);
    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Organize the following text into three categories:",
            "1. **key_points** — main topics and important information",
            "2. **action_items** — tasks assigned with owner and deadline",
            "3. **decisions** — conclusions or agreements reached",
            "",
            `raw_text_length: ${args.raw_text.length}`,
            `text_preview: ${args.raw_text.slice(0, 500)}`,
          ].join("\n"),
        },
      ],
    };
  }
);

export function createAnalyzerServer() {
  return createSdkMcpServer({
    name: "analyzer",
    tools: [extractStructureTool],
  });
}

// Only run standalone when this file is the entry point
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("content_analyzer.ts");
if (isMain) {
  const filePath = process.argv[2] || "Samples/meeting_notes.md";

  run("Content Analyzer", async () => {
    console.log(`Analyzing: ${filePath}\n`);

    const stream = query({
      prompt: `${SYSTEM_PROMPT}\n\n${ANALYZER_PROMPT}\n\nFile path: ${filePath}`,
      options: {
        allowedTools: ["Read", "mcp__analyzer__extract_structure"],
        maxTurns: 5,
        permissionMode: "bypassPermissions",
        mcpServers: {
          analyzer: createAnalyzerServer(),
        },
      },
    });

    for await (const message of stream) {
      if (message.type === "assistant") {
        const content = (message as any).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              save(block.text);
            } else if (block.type === "tool_use") {
              console.log(`  [Tool] ${block.name}`);
            }
          }
        }
      }
      if (message.type === "result") {
        const result = message as any;
        console.log(
          `\nCost: $${result.total_cost_usd?.toFixed(4) ?? "N/A"}`
        );
      }
    }
  });
}
