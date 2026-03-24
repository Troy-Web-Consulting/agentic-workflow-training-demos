import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { SYSTEM_PROMPT, ANALYZER_PROMPT, save, run } from "./content_request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createAnalyzerServer() {
  return createSdkMcpServer({
    name: "analyzer",
    tools: [
      tool(
        "extract_structure",
        "Extracts structured information from raw document text, organizing it into key points, action items, and decisions.",
        { raw_text: z.string().describe("The full raw text of the document to analyze") },
        async (args) => {
          console.log(`\n[extract_structure called with ${args.raw_text.length} chars]\n`);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  instructions: "Organize the following text into three categories: key_points (main topics and findings), action_items (who needs to do what and by when), and decisions (what was decided and why). Use bullet points for each category.",
                  raw_text_length: args.raw_text.length,
                  text_preview: args.raw_text.slice(0, 500),
                }),
              },
            ],
          };
        }
      ),
    ],
  });
}

// Run standalone when executed directly
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__dirname, "content_analyzer.ts");
if (isMain) {
  const filePath = process.argv[2] || path.join(__dirname, "Samples", "meeting_notes.md");

  run("Content Analyzer", async () => {
    save(`Analyzing: ${filePath}\n`);

    for await (const message of query({
      prompt: ANALYZER_PROMPT(filePath),
      options: {
        systemPrompt: SYSTEM_PROMPT,
        allowedTools: ["Read", "mcp__analyzer__extract_structure"],
        mcpServers: { analyzer: createAnalyzerServer() },
        maxTurns: 5,
      },
    })) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text") {
            save(block.text);
          }
        }
      }

      if (message.type === "result") {
        console.log(`\n--- Cost: $${message.total_cost_usd?.toFixed(4) ?? "N/A"} ---`);
      }
    }
  });
}
