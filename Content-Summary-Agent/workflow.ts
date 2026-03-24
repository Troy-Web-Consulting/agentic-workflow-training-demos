import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { fileURLToPath } from "url";
import {
  SYSTEM_PROMPT,
  READER_PROMPT,
  ANALYZER_PROMPT,
  WRITER_PROMPT,
  processMessage,
  run,
} from "./content_request.js";
import { createAnalyzerServer } from "./content_analyzer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = process.argv[2] || path.join(__dirname, "Samples", "meeting_notes.md");

run("Content Summary Workflow", async () => {
  let sessionId: string | undefined;

  // Agent 1: Content Reader
  console.log("\n--- Agent 1: Content Reader ---\n");
  for await (const message of query({
    prompt: READER_PROMPT(filePath),
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ["Read"],
      maxTurns: 3,
    },
  })) {
    const id = processMessage(message);
    if (id) sessionId = id;
  }

  if (!sessionId) {
    throw new Error("Failed to capture session ID from Agent 1");
  }

  // Agent 2: Analyzer
  console.log("\n--- Agent 2: Analyzer ---\n");
  for await (const message of query({
    prompt: ANALYZER_PROMPT(filePath),
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ["Read", "mcp__analyzer__extract_structure"],
      mcpServers: { analyzer: createAnalyzerServer() },
      maxTurns: 5,
      resume: sessionId,
    },
  })) {
    processMessage(message);
  }

  // Agent 3: Brief Writer
  console.log("\n--- Agent 3: Brief Writer ---\n");
  for await (const message of query({
    prompt: WRITER_PROMPT,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: [],
      maxTurns: 1,
      resume: sessionId,
    },
  })) {
    processMessage(message);
  }
});
