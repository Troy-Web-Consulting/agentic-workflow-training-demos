import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import path from "path";
import { SYSTEM_PROMPT, ANALYZER_PROMPT, save, run } from "./content_request.js";

export function createToolsServer() {
  return createSdkMcpServer({
    name: "tools",
    tools: [
      tool(
        "extract_structure",
        "Extract structured information from raw document text. Organizes content into key_points, action_items, and decisions.",
        { raw_text: z.string() },
        async ({ raw_text }) => {
          console.log(`\n[extract_structure] Called with ${raw_text.length} chars of input\n`);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  instructions:
                    "Organize the document text into three categories: key_points (main topics and findings), action_items (who must do what and by when), and decisions (choices that were finalized). Present each category as a bulleted list.",
                  raw_text_length: raw_text.length,
                  text_preview: raw_text.slice(0, 500),
                }),
              },
            ],
          };
        }
      ),
      tool(
        "send_slack_summary",
        "Post a formatted summary to Slack via webhook. Use this after writing a brief to notify the team.",
        {
          title: z.string(),
          summary: z.string(),
          key_points: z.array(z.string()),
          action_items: z.array(z.string()),
        },
        async ({ title, summary, key_points, action_items }) => {
          console.log(
            `\n[send_slack_summary] Called with title="${title}", ${key_points.length} key points, ${action_items.length} action items\n`
          );

          const webhookUrl =
            process.env.SLACK_WEBHOOK_URL ||
            "https://hooks.slack.com/services/YOUR/WEBHOOK/URL";

          const blocks = [
            { type: "header", text: { type: "plain_text", text: title } },
            { type: "section", text: { type: "mrkdwn", text: summary } },
            { type: "divider" },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Key Points*\n${key_points.map((p) => `• ${p}`).join("\n")}`,
              },
            },
            { type: "divider" },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Action Items*\n${action_items.map((a) => `• ${a}`).join("\n")}`,
              },
            },
            { type: "divider" },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Posted by Content Summary Agent | ${new Date().toISOString()}`,
                },
              ],
            },
          ];

          const payload = {
            text: `${title}: ${summary}`,
            blocks,
          };

          try {
            const res = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const status = res.ok ? "sent" : `failed (${res.status})`;
            console.log(`\nSlack notification: ${status}`);

            return {
              content: [
                {
                  type: "text" as const,
                  text: res.ok
                    ? "Slack summary posted successfully."
                    : `Slack post failed with status ${res.status}.`,
                },
              ],
            };
          } catch (err) {
            console.error("\nSlack notification error:", err);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Slack post failed: ${err}`,
                },
              ],
            };
          }
        }
      ),
    ],
  });
}

const filePath = process.argv[2] || path.join("Samples", "meeting_notes.md");

run("Content Analyzer", async () => {
  save(`Analyzing: ${filePath}\n`);

  for await (const message of query({
    prompt: ANALYZER_PROMPT(filePath),
    options: {
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ["Read", "mcp__tools__extract_structure"],
      mcpServers: { tools: createToolsServer() },
      maxTurns: 5,
    },
  })) {
    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block) {
          save(block.text);
        }
      }
    }

    if (message.type === "result") {
      console.log();
      console.log("-".repeat(40));
      console.log(`Cost: $${message.total_cost_usd.toFixed(4)}`);
      console.log(`Turns: ${message.num_turns}`);
    }
  }
});
