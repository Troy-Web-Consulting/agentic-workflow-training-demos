import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import path from "path";
import { SYSTEM_PROMPT, ANALYZER_PROMPT, save, run } from "./content_request.js";

export function createAnalyzerServer() {
  return createSdkMcpServer({
    name: "analyzer",
    tools: [
      tool(
        "extract_structure",
        "Extract structured information from raw document text. Organizes content into key_points, action_items, and decisions.",
        { raw_text: z.string() },
        async ({ raw_text }) => {
          console.log(`\n[extract_structure] Called with ${raw_text.length} chars of input\n`);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  instructions:
                    "Organize the document text into three categories: key_points (main topics and findings), action_items (who must do what and by when), and decisions (choices that were finalized). Present each category as a bulleted list.",
                  raw_text_length: raw_text.length,
                  text_preview: raw_text.slice(0, 500),
                }),
              },
            ],
          };
        }
      ),
    ],
  });
}

const filePath = process.argv[2] || path.join("Samples", "meeting_notes.md");

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
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          save(block.text);
        }
      }
    }

    if (message.type === "result") {
      console.log();
      console.log("-".repeat(40));
      console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      console.log(`Turns: ${message.num_turns}`);
    }
  }
});
