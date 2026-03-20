Add a Slack webhook notification to the pipeline by modifying `workflow.ts`.

Add a sendSlackNotification() function to `workflow.ts` that:
- POSTs to a Slack webhook URL using native fetch()
- Payload format: { text: "Content Summary Agent completed: <first 2-3 sentences>" }
- Extract the first 2-3 sentences from the brief by stripping markdown headers, collapsing newlines, splitting on sentence boundaries, and taking the first 3 that are >10 chars
- Read webhook URL from SLACK_WEBHOOK_URL env var with a default fallback

After Agent 3 completes, capture the brief output text and call sendSlackNotification().

Change the default input file to samples/project_status.md.
