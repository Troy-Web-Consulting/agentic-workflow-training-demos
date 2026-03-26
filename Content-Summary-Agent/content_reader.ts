import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { SYSTEM_PROMPT, READER_PROMPT, save, run } from "./content_request.js";

const filePath = process.argv[2] || path.join("Samples", "meeting_notes.md");

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
