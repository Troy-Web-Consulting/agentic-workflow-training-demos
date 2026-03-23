Refactor the Slack integration so the agent itself posts to Slack using a tool, instead of your code calling Slack after the pipeline.

Replace the sendSlackNotification() function in `workflow.ts` with a new MCP tool called `send_slack_summary`:
- Accepts: title (string), summary (string), key_points (array of strings), action_items (array of strings) — all validated with zod
- Logs that it was called with the title and counts of key_points/action_items
- Builds a Slack Block Kit payload with: a header block (title), a section block (summary), a divider, a section with key points as bullet list, a divider, a section with action items as bullet list, a divider, and a context block with "Posted by Content Summary Agent" and the current timestamp
- Also includes a top-level `text` field as a notification fallback
- POSTs to the SLACK_WEBHOOK_URL using native fetch()
- Returns a success or failure message as tool content

Put both extract_structure and send_slack_summary on a single MCP server named "tools".

Add send_slack_summary to allowedTools: "mcp__tools__send_slack_summary"

Update the Agent 3 prompt to instruct it: after writing the brief, use send_slack_summary to post a formatted summary with the title, a 2-3 sentence summary, the most important key points, and all action items.
