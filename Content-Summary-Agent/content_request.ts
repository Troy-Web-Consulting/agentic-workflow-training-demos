import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export const SYSTEM_PROMPT = `You are a content analysis specialist. Read documents and extract key information clearly and concisely. Use bullet points over paragraphs, skip filler, and aim for under 400 words.`;

export const READER_PROMPT = (filePath: string) =>
  `Read the file at "${filePath}" using the Read tool. Then provide a structured summary that identifies:
- Main topics discussed
- Key decisions made
- Action items and who is responsible

Format your response with clear headings and bullet points.`;

export const ANALYZER_PROMPT = (filePath: string) =>
  `Read the file at "${filePath}" using the Read tool. Then you MUST use the extract_structure tool on the raw text you read. Pass the full document text to extract_structure and use its output to organize your response into the three categories it specifies.`;

export const WRITER_PROMPT = `You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words.`;

const buffer: string[] = [];

export function save(text: string) {
  buffer.push(text);
}

export function processMessage(message: any): string | undefined {
  let sessionId: string | undefined;

  if (message.type === "system" && message.subtype === "init" && message.session_id) {
    sessionId = message.session_id;
  }

  if ("content" in message && Array.isArray(message.content)) {
    for (const block of message.content) {
      if (block.type === "text") {
        console.log(block.text);
        save(block.text);
      } else if (block.type === "tool_use") {
        console.log(`\n[tool_use] ${block.name}`);
      }
    }
  }

  if ("result" in message) {
    console.log(message.result);
    save(message.result);
    if (message.total_cost_usd != null) {
      console.log(`\nCost: $${message.total_cost_usd.toFixed(4)}`);
    }
  }

  return sessionId;
}

export async function run(main: () => Promise<void>) {
  console.log("=== Content Summary Agent ===\n");

  await main();

  if (buffer.length > 0) {
    const outputDir = join(process.cwd(), "Outputs");
    mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = join(outputDir, `summary-${timestamp}.md`);
    writeFileSync(outputPath, buffer.join("\n\n"), "utf-8");
    console.log(`\nOutput saved to: ${outputPath}`);
  }
}
