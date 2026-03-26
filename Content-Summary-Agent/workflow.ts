import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import {
  SYSTEM_PROMPT,
  READER_PROMPT,
  ANALYZER_PROMPT,
  WRITER_PROMPT,
  processMessage,
  save,
  run,
} from './content_request.js';
import { createToolsServer } from './content_analyzer.js';

const filePath = process.argv[2] || path.join('samples', 'project_status.md');

const toolsServer = createToolsServer();

run('Content Summary Workflow', async () => {
  let sessionId: string | undefined;

  // --- Agent 1: Content Reader ---
  save('## Agent 1: Content Reader\n');

  for await (const message of query({
    prompt: READER_PROMPT(filePath),
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ['Read'],
      maxTurns: 3,
    },
  })) {
    const sid = processMessage(message);
    if (sid) sessionId = sid;
  }

  if (!sessionId) {
    throw new Error('Failed to get session_id from Agent 1');
  }

  console.log(`\nSession: ${sessionId}\n`);

  // --- Agent 2: Analyzer ---
  save('\n## Agent 2: Analyzer\n');

  for await (const message of query({
    prompt: ANALYZER_PROMPT(filePath),
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ['Read', 'mcp__tools__extract_structure'],
      mcpServers: { tools: toolsServer },
      maxTurns: 5,
      resume: sessionId,
    },
  })) {
    processMessage(message);
  }

  // --- Agent 3: Brief Writer ---
  save('\n## Agent 3: Brief Writer\n');

  for await (const message of query({
    prompt: WRITER_PROMPT,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ['mcp__tools__send_slack_summary'],
      mcpServers: { tools: toolsServer },
      maxTurns: 3,
      resume: sessionId,
    },
  })) {
    processMessage(message);
  }
});
