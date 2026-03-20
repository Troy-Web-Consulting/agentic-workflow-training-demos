Now add a custom MCP tool to content_reader.ts.

Update `content_reader.ts` to:
- Add a custom MCP tool called `extract_structure` using createSdkMcpServer and tool() from the SDK
- The extract_structure tool:
  - Accepts a `raw_text` string parameter (validated with zod)
  - Logs that it was called with the input length
  - Returns instructions telling the agent to organize the text into three categories: key_points, action_items, and decisions
  - Returns the raw_text_length and a text_preview (first 500 chars)
- Wire the tool into an MCP server named "analyzer"
- Use allowedTools: ["Read", "mcp__analyzer__extract_structure"]
- Change the system prompt to use ANALYZER_PROMPT instead of READER_PROMPT
- Set maxTurns to 5

Add ANALYZER_PROMPT to `content_request.ts`: instructions to ALWAYS use extract_structure, read the doc first with Read, then use extract_structure on the raw text.
