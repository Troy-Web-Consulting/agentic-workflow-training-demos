import { writeFileSync, mkdirSync } from "fs";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

export const SYSTEM_PROMPT =
  "You are a content analysis specialist. Read documents and extract key information clearly and concisely. Use bullet points over paragraphs, skip filler, and aim for under 400 words.";

export const READER_PROMPT =
  "Read the document at the given file path. Identify the main topics discussed, any decisions made, and action items assigned. Use the Read tool to access the file.";

export const ANALYZER_PROMPT =
  "ALWAYS use extract_structure. First, read the document with the Read tool, then call extract_structure on the raw text you read. Organize the extracted information into key_points, action_items, and decisions.";

export const WRITER_PROMPT =
  "You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words.";

const buffer: string[] = [];

export function save(text: string): void {
  console.log(text);
  buffer.push(text);
}

export function processMessage(message: SDKMessage): string | undefined {
  let sessionId: string | undefined;

  if ("session_id" in message && message.session_id) {
    sessionId = message.session_id as string;
  }

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
      `  Cost: $${result.total_cost_usd?.toFixed(4) ?? "N/A"} | Turns: ${result.num_turns ?? "?"}`
    );
  }

  return sessionId;
}

export function run(name: string, main: () => Promise<void>): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"=".repeat(60)}\n`);

  main()
    .then(() => {
      mkdirSync("Outputs", { recursive: true });
      const filename = `Outputs/${name.replace(/\s+/g, "_")}_${Date.now()}.md`;
      writeFileSync(filename, buffer.join("\n\n"));
      console.log(`\nOutput saved to ${filename}`);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
