import { query } from "@anthropic-ai/claude-agent-sdk";
import { SYSTEM_PROMPT, READER_PROMPT, save, run } from "./content_request.js";

const filePath = process.argv[2] || "Samples/meeting_notes.md";

run("Content Reader", async () => {
  console.log(`Reading: ${filePath}\n`);

  const stream = query({
    prompt: `${SYSTEM_PROMPT}\n\n${READER_PROMPT}\n\nFile path: ${filePath}`,
    options: {
      allowedTools: ["Read"],
      maxTurns: 3,
      permissionMode: "bypassPermissions",
    },
  });

  for await (const message of stream) {
    if (message.type === "assistant") {
      const content = (message as any).message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text") {
            save(block.text);
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
