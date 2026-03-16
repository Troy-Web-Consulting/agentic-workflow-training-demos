/**
 * Shared prompts, helpers, and types for all demo steps.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUT_DIR = path.join(__dirname, "Outputs");

// Buffer for agent text output (call save() to capture text content)
let _outputBuf = "";

export function save(text: string): void {
  console.log(text);
  _outputBuf += text;
}

export function run(
  title: string,
  fn: () => Promise<void>,
  filename: string,
  subtitle?: string
): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  _outputBuf = "";

  console.log("=".repeat(60));
  console.log(title);
  if (subtitle) {
    console.log(`  What's New: ${subtitle}`);
  }
  console.log("=".repeat(60));

  fn().then(() => {
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), _outputBuf, "utf-8");
  });
}

// -- Prompts ------------------------------------------------------------------

export const SYSTEM_PROMPT =
  "You are a content analysis specialist. " +
  "Read documents and extract key information clearly and concisely. " +
  "Use bullet points over paragraphs, skip filler, " +
  "and aim for under 400 words.";

export const READER_PROMPT =
  " Read the provided document and produce a clear, organized summary. " +
  "Identify the main topics discussed, any decisions made, and any " +
  "action items or next steps mentioned. Use the Read tool to read the file.";

export const ANALYZER_PROMPT =
  " ALWAYS use the extract_structure tool to categorize the content " +
  "into key points, action items, and decisions. Read the document first " +
  "with the Read tool, then use extract_structure on the raw text.";

export const WRITER_PROMPT =
  " You are a brief writer. Using all the information available in this " +
  "conversation, produce a clean, professional brief with these sections: " +
  "## Summary, ## Key Points, ## Action Items, ## Decisions. " +
  "Format action items with owner and deadline where available. " +
  "Keep the entire brief under 500 words.";
