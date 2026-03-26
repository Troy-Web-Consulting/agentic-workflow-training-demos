import { writeFileSync, mkdirSync } from "fs";
import path from "path";

export const SYSTEM_PROMPT =
  "You are a content analysis specialist. Read documents and extract key information clearly and concisely. Use bullet points over paragraphs, skip filler, and aim for under 400 words.";

export const READER_PROMPT = (filePath: string) =>
  `Read the document at "${filePath}" using the Read tool. Then provide a structured summary that identifies:
- Main topics discussed
- Key decisions made
- Action items (who, what, when)

Be concise and use bullet points.`;

export const ANALYZER_PROMPT = (filePath: string) =>
  `You MUST use the extract_structure tool to analyze the document. Follow these steps exactly:
1. First, use the Read tool to read the document at "${filePath}"
2. Then, call the extract_structure tool with the full raw text of the document
3. Finally, present the structured analysis based on the tool's output

Do NOT skip the extract_structure tool. Always call it after reading the document.`;

export const WRITER_PROMPT =
  "You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words.\n\nAfter writing the brief, use the send_slack_summary tool to post a formatted summary to Slack. Provide: a concise title for the document, a 2-3 sentence summary, the most important key points as an array of strings, and all action items as an array of strings.";

const buffer: string[] = [];

export function save(text: string): void {
  console.log(text);
  buffer.push(text);
}

export function processMessage(message: any): string | undefined {
  let sessionId: string | undefined;

  if (message.session_id) {
    sessionId = message.session_id;
  }

  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) {
        save(block.text);
      } else if ("name" in block) {
        console.log(`  [tool] ${block.name}`);
      }
    }
  }

  if (message.type === "result") {
    console.log();
    console.log("-".repeat(40));
    console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
    console.log(`Turns: ${message.num_turns}`);
  }

  return sessionId;
}

export function run(title: string, main: () => Promise<void>): void {
  console.log("=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
  console.log();

  main()
    .then(() => {
      const outputDir = path.join(process.cwd(), "Outputs");
      mkdirSync(outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${title.replace(/\s+/g, "_")}_${timestamp}.md`;
      const outputPath = path.join(outputDir, filename);

      writeFileSync(outputPath, buffer.join("\n"), "utf-8");
      console.log(`\nOutput saved to: ${outputPath}`);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
