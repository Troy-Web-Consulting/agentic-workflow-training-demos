import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  SYSTEM_PROMPT,
  READER_PROMPT,
  ANALYZER_PROMPT,
  WRITER_PROMPT,
  processMessage,
  run,
} from "./content_request.js";
import { createAnalyzerServer } from "./content_analyzer.js";

const filePath = process.argv[2] || "Samples/meeting_notes.md";

run("Content Summary Workflow", async () => {
  let sessionId: string | undefined;

  // Agent 1: Content Reader
  console.log("--- Agent 1: Content Reader ---\n");
  const reader = query({
    prompt: `${SYSTEM_PROMPT}\n\n${READER_PROMPT}\n\nFile path: ${filePath}`,
    options: {
      allowedTools: ["Read"],
      maxTurns: 3,
      permissionMode: "bypassPermissions",
    },
  });

  for await (const message of reader) {
    const sid = processMessage(message);
    if (sid) sessionId = sid;
  }

  if (!sessionId) {
    throw new Error("No session ID from Agent 1");
  }

  // Agent 2: Analyzer
  console.log("\n--- Agent 2: Analyzer ---\n");
  const analyzer = query({
    prompt: ANALYZER_PROMPT,
    options: {
      resume: sessionId,
      allowedTools: ["Read", "mcp__analyzer__extract_structure"],
      maxTurns: 5,
      permissionMode: "bypassPermissions",
      mcpServers: {
        analyzer: createAnalyzerServer(),
      },
    },
  });

  for await (const message of analyzer) {
    const sid = processMessage(message);
    if (sid) sessionId = sid;
  }

  // Agent 3: Brief Writer
  console.log("\n--- Agent 3: Brief Writer ---\n");
  const writer = query({
    prompt: WRITER_PROMPT,
    options: {
      resume: sessionId,
      allowedTools: [],
      maxTurns: 1,
      permissionMode: "bypassPermissions",
    },
  });

  for await (const message of writer) {
    processMessage(message);
  }
});
