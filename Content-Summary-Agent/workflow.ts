import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import readline from 'readline';
import { readFileSync, writeFileSync } from 'fs';
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
import { detectPII, sanitizeInput, sanitizeOutput } from './sanitizer.js';

const filePath = process.argv[2] || path.join('samples', 'customer_feedback_report.md');

const toolsServer = createToolsServer();

function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseBudgetArg(): number | null {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--') && !isNaN(parseFloat(arg.slice(2)))) {
      return parseFloat(arg.slice(2));
    }
  }
  return null;
}

function getAgentCost(message: any): number {
  if (message.type === 'result' && typeof message.total_cost_usd === 'number') {
    return message.total_cost_usd;
  }
  return 0;
}

run('Content Summary Workflow', async () => {
  let sessionId: string | undefined;

  // --- Budget Setup ---
  let MAX_BUDGET_USD = parseBudgetArg();
  if (MAX_BUDGET_USD === null) {
    const input = await askUser('Enter daily budget limit (USD, e.g., 0.50): ');
    MAX_BUDGET_USD = parseFloat(input);
    if (isNaN(MAX_BUDGET_USD) || MAX_BUDGET_USD <= 0) {
      throw new Error(`Invalid budget: "${input}". Please provide a positive number.`);
    }
  }

  let cumulativeCostUsd = 0;
  save(`[COST] Budget: $${MAX_BUDGET_USD.toFixed(2)}\n`);

  // --- PRE-PROCESSING: PII Detection & Sanitization ---
  save('## Pre-Processing: PII Sanitization\n');

  const rawContent = readFileSync(filePath, 'utf-8');
  const inputFindings = detectPII(rawContent);
  const totalInputPII = inputFindings.reduce((sum, f) => sum + f.count, 0);

  if (inputFindings.length > 0) {
    save('PII detected in input:');
    for (const finding of inputFindings) {
      save(`  - ${finding.type}: ${finding.count} occurrence(s)`);
    }
  } else {
    save('No PII detected in input.');
  }

  const sanitizedContent = sanitizeInput(rawContent);

  const redactedInputPath = path.join('samples', 'customer_feedback_report_redacted.md');
  writeFileSync(redactedInputPath, sanitizedContent, 'utf-8');
  save(`\nRedacted input saved to: ${redactedInputPath}\n`);

  // --- Agent 1: Content Reader ---
  save('## Agent 1: Content Reader\n');

  let agent1Cost = 0;
  for await (const message of query({
    prompt: `Here is the document content to analyze:\n\n${sanitizedContent}\n\nProvide a structured summary that identifies:\n- Main topics discussed\n- Key decisions made\n- Action items (who, what, when)\n\nBe concise and use bullet points.`,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      maxTurns: 3,
    },
  })) {
    const sid = processMessage(message);
    if (sid) sessionId = sid;
    agent1Cost += getAgentCost(message);
  }

  cumulativeCostUsd += agent1Cost;
  save(`[COST] Agent 1 cost: $${agent1Cost.toFixed(4)} | cumulative: $${cumulativeCostUsd.toFixed(4)} / $${MAX_BUDGET_USD.toFixed(2)}`);

  if (!sessionId) {
    throw new Error('Failed to get session_id from Agent 1');
  }

  console.log(`\nSession: ${sessionId}\n`);

  // Budget check after Agent 1
  if (cumulativeCostUsd > MAX_BUDGET_USD) {
    save(`[BUDGET EXCEEDED] Daily limit of $${MAX_BUDGET_USD.toFixed(2)} has been exceeded. Current spend: $${cumulativeCostUsd.toFixed(4)}`);
    const answer = await askUser('Would you like to continue? (yes/no): ');
    if (answer.toLowerCase() === 'no') {
      save('\nPipeline stopped by user after budget exceeded (Agent 1).');
      save(`\n**Total cost**: $${cumulativeCostUsd.toFixed(4)}`);
      return;
    }
  }

  // --- Agent 2: Analyzer ---
  save('\n## Agent 2: Analyzer\n');

  let agent2Cost = 0;
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
    agent2Cost += getAgentCost(message);
  }

  cumulativeCostUsd += agent2Cost;
  save(`[COST] Agent 2 cost: $${agent2Cost.toFixed(4)} | cumulative: $${cumulativeCostUsd.toFixed(4)} / $${MAX_BUDGET_USD.toFixed(2)}`);

  // Budget check after Agent 2
  if (cumulativeCostUsd > MAX_BUDGET_USD) {
    save(`[BUDGET EXCEEDED] Daily limit of $${MAX_BUDGET_USD.toFixed(2)} has been exceeded. Current spend: $${cumulativeCostUsd.toFixed(4)}`);
    const answer = await askUser('Would you like to continue? (yes/no): ');
    if (answer.toLowerCase() === 'no') {
      save('\nPipeline stopped by user after budget exceeded (Agent 2).');
      save(`\n**Total cost**: $${cumulativeCostUsd.toFixed(4)}`);
      return;
    }
  }

  // --- Agent 3: Brief Writer ---
  save('\n## Agent 3: Brief Writer\n');

  let agent3Output = '';
  let agent3Cost = 0;

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
    agent3Cost += getAgentCost(message);

    if (message.type === 'assistant' && message.message?.content) {
      for (const block of message.message.content) {
        if ('text' in block) {
          agent3Output += block.text;
        }
      }
    }
  }

  cumulativeCostUsd += agent3Cost;
  save(`[COST] Agent 3 cost: $${agent3Cost.toFixed(4)} | cumulative: $${cumulativeCostUsd.toFixed(4)} / $${MAX_BUDGET_USD.toFixed(2)}`);

  // --- POST-PROCESSING: Output PII Check ---
  save('\n## Post-Processing: Output PII Check\n');

  const outputFindings = detectPII(agent3Output);
  const totalOutputPII = outputFindings.reduce((sum, f) => sum + f.count, 0);

  let finalOutput = agent3Output;

  if (outputFindings.length > 0) {
    save('PII detected in output — applying redaction:');
    for (const finding of outputFindings) {
      save(`  - ${finding.type}: ${finding.count} occurrence(s)`);
    }
    finalOutput = sanitizeOutput(agent3Output);
  } else {
    save('No PII leaked through to output.');
  }

  const redactedOutputPath = path.join('samples', 'reacted_report.md');
  writeFileSync(redactedOutputPath, finalOutput, 'utf-8');
  save(`Redacted output saved to: ${redactedOutputPath}\n`);

  // --- Summary ---
  const totalRedacted = totalInputPII + totalOutputPII;
  save(`\n**PII Redaction Summary**: ${totalRedacted} PII item(s) redacted total (${totalInputPII} in input, ${totalOutputPII} in output).`);
  save(`Note for Slack: ${totalRedacted} PII item(s) were detected and redacted during processing.`);
  save(`\n**Total Pipeline Cost**: $${cumulativeCostUsd.toFixed(4)} / $${MAX_BUDGET_USD.toFixed(2)} budget`);
});
