// Step 4b: Slack as an Agent-Callable MCP Tool with Block Kit
// Instead of code calling Slack after the pipeline, the agent itself
// has a tool it can use to post to Slack. This is the key shift:
// the agent decides to take a real-world action.

import {
  query,
  createSdkMcpServer,
  tool,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  SDKAssistantMessage,
  SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SYSTEM_PROMPT,
  READER_PROMPT,
  ANALYZER_PROMPT,
  WRITER_PROMPT,
  run,
  save,
} from '../content_request.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ??
  'https://hooks.slack.com/services/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';

// -- Custom Tool: extract_structure (same as Phase 1) -------------------------

const extractStructure = tool(
  'extract_structure',
  'Extract structured information from raw text. Returns key points, action items, and decisions as categorized JSON.',
  {
    raw_text: z
      .string()
      .describe('The raw document text to analyze and categorize'),
  },
  async (args) => {
    console.log('\n  >> extract_structure tool called');
    console.log(`  >> Input length: ${args.raw_text.length} chars\n`);

    const result = {
      instructions:
        'Analyze the provided text and organize it into three categories: ' +
        'key_points (important facts/updates), action_items (tasks with owners/deadlines), ' +
        'and decisions (choices that were made). Return your analysis as structured text.',
      raw_text_length: args.raw_text.length,
      text_preview: args.raw_text.slice(0, 500) + '...',
    };

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(result, null, 2) },
      ],
    };
  },
);

// -- Custom Tool: send_slack_summary (NEW — agent-callable) -------------------

const sendSlackSummary = tool(
  'send_slack_summary',
  'Post a formatted summary to the team Slack channel. Use this after writing the brief to notify the team. Provide a short summary, key points as bullet strings, and action items as bullet strings.',
  {
    title: z
      .string()
      .describe('Title for the Slack message, e.g. the document name'),
    summary: z.string().describe('A 2-3 sentence summary of the document'),
    key_points: z
      .array(z.string())
      .describe('List of key points as short bullet strings'),
    action_items: z
      .array(z.string())
      .describe('List of action items as short bullet strings'),
  },
  async (args) => {
    console.log('\n  >> send_slack_summary tool called');
    console.log(`  >> Title: ${args.title}`);
    console.log(
      `  >> Key points: ${args.key_points.length}, Action items: ${args.action_items.length}\n`,
    );

    // Build Slack Block Kit payload
    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: args.title, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: args.summary },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '*Key Points*\n' + args.key_points.map((p) => `• ${p}`).join('\n'),
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            '*Action Items*\n' +
            args.action_items.map((a) => `• ${a}`).join('\n'),
        },
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Posted by Content Summary Agent | ${new Date().toLocaleString()}`,
          },
        ],
      },
    ];

    const payload = {
      text: `Content Summary: ${args.title}`, // fallback for notifications
      blocks,
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('[Webhook] Slack notification sent successfully.');
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Slack notification sent successfully.',
          },
        ],
      };
    } else {
      const status = `${response.status}: ${response.statusText}`;
      console.log(`[Webhook] Slack returned ${status}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Slack notification failed: ${status}`,
          },
        ],
      };
    }
  },
);

// -- Helper to process messages from a query ----------------------------------

function processMessage(msg: SDKMessage, agentLabel: string): string | null {
  if (msg.type === 'assistant') {
    const assistantMsg = msg as SDKAssistantMessage;
    for (const block of assistantMsg.message.content) {
      if (block.type === 'text') {
        save(block.text);
      } else if (block.type === 'tool_use') {
        console.log(`\n  -- Tool: ${block.name}(...) --\n`);
      }
    }
  } else if (msg.type === 'result' && (msg as any).subtype === 'success') {
    const result = msg as any;
    console.log(
      `\n-- ${agentLabel} cost: $${result.total_cost_usd.toFixed(4)} --`,
    );
  }

  return (msg as any).session_id ?? null;
}

async function main() {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '../samples/project_status.md');

  // MCP server now has BOTH tools
  const toolServer = createSdkMcpServer({
    name: 'tools',
    tools: [extractStructure, sendSlackSummary],
  });

  const baseOptions = {
    systemPrompt: SYSTEM_PROMPT,
    mcpServers: { tools: toolServer },
    allowedTools: [
      'Read',
      'mcp__tools__extract_structure',
      'mcp__tools__send_slack_summary',
    ],
    env: { ...process.env, CLAUDECODE: undefined },
    maxTurns: 5,
  };

  let sessionId = '';

  // -- Agent 1: Content Reader ------------------------------------------------
  console.log('\n>> Agent 1: Reading the document...\n');

  for await (const msg of query({
    prompt:
      READER_PROMPT + `\n\nRead and summarize the document at: ${filePath}`,
    options: baseOptions,
  })) {
    const sid = processMessage(msg, 'Agent 1');
    if (sid) sessionId = sid;
  }

  // -- Agent 2: Analyzer (resumes Agent 1's session) --------------------------
  console.log('\n>> Agent 2: Extracting structure...\n');

  for await (const msg of query({
    prompt:
      ANALYZER_PROMPT +
      '\n\nNow use the extract_structure tool on the document content from above ' +
      'to categorize it into key points, action items, and decisions.',
    options: { ...baseOptions, resume: sessionId },
  })) {
    processMessage(msg, 'Agent 2');
  }

  // -- Agent 3: Brief Writer + Slack Poster -----------------------------------
  console.log('\n>> Agent 3: Writing the brief and posting to Slack...\n');

  for await (const msg of query({
    prompt:
      WRITER_PROMPT +
      '\n\nUsing all the analysis from above, produce the final brief now. ' +
      'After writing the brief, use the send_slack_summary tool to post a ' +
      'formatted summary to the team Slack channel. Include a short 2-3 sentence ' +
      'summary, the most important key points, and all action items.',
    options: { ...baseOptions, resume: sessionId },
  })) {
    processMessage(msg, 'Agent 3');
  }
}

run(
  'STEP 4B: Pipeline with Agent-Driven Slack Tool (Block Kit)',
  main,
  'step4b_output.md',
  'Slack webhook as an MCP tool the agent calls — with Block Kit formatting',
);
