import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { fileURLToPath } from "url";
import { SYSTEM_PROMPT, READER_PROMPT, save, run } from "./content_request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = process.argv[2] || path.join(__dirname, "Samples", "meeting_notes.md");

run("Content Reader", async () => {
  save(`Reading: ${filePath}\n`);

  for await (const message of query({
    prompt: READER_PROMPT(filePath),
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ["Read"],
      maxTurns: 3,
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
