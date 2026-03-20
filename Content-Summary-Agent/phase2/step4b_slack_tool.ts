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

const WRITER_PROMPT_WITH_SLACK = `${WRITER_PROMPT}

After writing the brief, use the send_slack_summary tool to post a formatted summary to Slack. Provide:
- title: a short descriptive title for the document
- summary: a 2-3 sentence overview of the content
- key_points: the most important key points as an array of strings
- action_items: all action items as an array of strings (include owner and deadline where available)`;

const toolsServer = createSdkMcpServer({
  name: 'tools',
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
    tool(
      'send_slack_summary',
      'Posts a formatted content summary to Slack via webhook.',
      {
        title: z.string().describe('A short descriptive title for the summary'),
        summary: z.string().describe('A 2-3 sentence overview of the content'),
        key_points: z
          .array(z.string())
          .describe('The most important key points'),
        action_items: z
          .array(z.string())
          .describe('Action items with owner and deadline'),
      },
      async ({ title, summary, key_points, action_items }) => {
        console.log(
          `\n[send_slack_summary] Called with title: "${title}", ${key_points.length} key points, ${action_items.length} action items`,
        );

        const payload = {
          text: `Content Summary Agent: ${title} — ${summary}`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: title, emoji: true },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: summary },
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Key Points*\n${key_points.map((p) => `• ${p}`).join('\n')}`,
              },
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Action Items*\n${action_items.map((a) => `• ${a}`).join('\n')}`,
              },
            },
            { type: 'divider' },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Posted by Content Summary Agent | ${new Date().toISOString()}`,
                },
              ],
            },
          ],
        };

        try {
          const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            console.log('Slack notification sent successfully.');
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Slack summary posted successfully.',
                },
              ],
            };
          } else {
            const errMsg = `Slack notification failed: ${response.status} ${response.statusText}`;
            console.error(errMsg);
            return {
              content: [{ type: 'text' as const, text: errMsg }],
            };
          }
        } catch (error) {
          const errMsg = `Failed to send Slack notification: ${error}`;
          console.error(errMsg);
          return {
            content: [{ type: 'text' as const, text: errMsg }],
          };
        }
      },
    ),
  ],
});

run(async () => {
  let sessionId: string | undefined;

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
      allowedTools: ['Read', 'mcp__tools__extract_structure'],
      mcpServers: { tools: toolsServer },
      maxTurns: 5,
    },
  })) {
    processMessage(message);
  }

  // --- Agent 3: Brief Writer + Slack ---
  console.log('\n--- Agent 3: Brief Writer + Slack ---\n');
  for await (const message of query({
    prompt: WRITER_PROMPT_WITH_SLACK,
    options: {
      resume: sessionId,
      allowedTools: ['mcp__tools__send_slack_summary'],
      mcpServers: { tools: toolsServer },
      maxTurns: 3,
    },
  })) {
    processMessage(message);
  }
});
