import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const SYSTEM_PROMPT =
  "You are a content analysis specialist. Read documents and extract key information clearly and concisely. Use bullet points over paragraphs, skip filler, and aim for under 400 words.";

export const READER_PROMPT = (filePath: string) =>
  `Read the document at "${filePath}" using the Read tool. Then produce a summary that identifies:\n- Main topics discussed\n- Key decisions made\n- Action items (who, what, when)\n\nBe concise and use bullet points.`;

export const ANALYZER_PROMPT = (filePath: string) =>
  `You MUST use the extract_structure tool to analyze the document. Follow these steps:
1. First, read the document at "${filePath}" using the Read tool.
2. Then, pass the full raw text to the extract_structure tool using mcp__analyzer__extract_structure.
3. Finally, organize the structured output into a clear summary.

Do not skip the extract_structure step.`;

export const WRITER_PROMPT =
  "You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words.";

const buffer: string[] = [];

export function processMessage(message: any): string | undefined {
  let sessionId: string | undefined;

  if (message.session_id) {
    sessionId = message.session_id;
  }

  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") {
        save(block.text);
      } else if (block.type === "tool_use") {
        console.log(`  [tool] ${block.name}`);
      }
    }
  }

  if (message.type === "result") {
    console.log(`\n--- Cost: $${message.total_cost_usd?.toFixed(4) ?? "N/A"} ---`);
  }

  return sessionId;
}

export function save(text: string): void {
  console.log(text);
  buffer.push(text);
}

export function run(label: string, main: () => Promise<void>): void {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(50)}\n`);

  main()
    .then(() => {
      const outputDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "Outputs");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      const outputFile = path.join(
        outputDir,
        `${label.replace(/\s+/g, "_")}.md`
      );
      writeFileSync(outputFile, buffer.join("\n"), "utf-8");
      console.log(`\nOutput saved to ${outputFile}`);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
