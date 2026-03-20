import {
  query,
  createSdkMcpServer,
  tool,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import {
  SYSTEM_PROMPT,
  READER_PROMPT,
  ANALYZER_PROMPT,
  WRITER_PROMPT,
  processMessage,
  run,
} from '../content_request.js';

const filePath = process.argv[2] || 'samples/project_status.md';

const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ||
  'https://hooks.slack.com/services/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';

function toSlackMrkdwn(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '*$1*');
}

function extractPreview(brief: string): string {
  const cleaned = brief
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  const meaningful = sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  return meaningful.slice(0, 3).join(' ');
}

async function sendSlackNotification(brief: string): Promise<void> {
  const preview = extractPreview(brief);
  const payload = {
    text: `Content Summary Agent completed: ${toSlackMrkdwn(preview)}`,
  };

  console.log('\n--- Sending Slack Notification ---\n');

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('Slack notification sent successfully.');
    } else {
      console.error(
        `Slack notification failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

const analyzerServer = createSdkMcpServer({
  name: 'analyzer',
  tools: [
    tool(
      'extract_structure',
      'Extracts structured information from raw text into key_points, action_items, and decisions.',
      { raw_text: z.string().describe('The raw document text to analyze') },
      async ({ raw_text }) => {
        console.log(
          `\n[extract_structure] Called with input length: ${raw_text.length} chars`,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                raw_text_length: raw_text.length,
                text_preview: raw_text.slice(0, 500),
                instructions:
                  'Organize the provided text into three categories: 1) key_points — the most important facts and updates, 2) action_items — tasks assigned with owner and deadline, 3) decisions — choices that were finalized. Present each category as a clearly labeled section.',
              }),
            },
          ],
        };
      },
    ),
  ],
});

run(async () => {
  let sessionId: string | undefined;
  let briefOutput = '';

  // --- Agent 1: Content Reader ---
  console.log('--- Agent 1: Content Reader ---\n');
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
    console.error('Failed to capture session ID from Agent 1.');
    return;
  }

  // --- Agent 2: Analyzer ---
  console.log('\n--- Agent 2: Analyzer ---\n');
  for await (const message of query({
    prompt: ANALYZER_PROMPT(filePath),
    options: {
      resume: sessionId,
      allowedTools: ['Read', 'mcp__analyzer__extract_structure'],
      mcpServers: { analyzer: analyzerServer },
      maxTurns: 5,
    },
  })) {
    processMessage(message);
  }

  // --- Agent 3: Brief Writer ---
  console.log('\n--- Agent 3: Brief Writer ---\n');
  for await (const message of query({
    prompt: WRITER_PROMPT,
    options: {
      resume: sessionId,
      allowedTools: [],
      maxTurns: 1,
    },
  })) {
    const msg = processMessage(message);

    if ('content' in message && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'text') {
          briefOutput += block.text;
        }
      }
    }
    if ('result' in message) {
      briefOutput += message.result;
    }
  }

  // --- Slack Notification ---
  if (briefOutput.trim()) {
    await sendSlackNotification(briefOutput);
  } else {
    console.log('\nNo brief output captured — skipping Slack notification.');
  }
});
