Create a new file `content_analyzer.ts` that adds structured analysis using a custom MCP tool.

Add ANALYZER_PROMPT to `content_request.ts`: instructions to ALWAYS use extract_structure — read the doc first with Read, then use extract_structure on the raw text.

Create `content_analyzer.ts`:
- Import createSdkMcpServer and tool from the SDK, z from zod
- Import SYSTEM_PROMPT, ANALYZER_PROMPT, save, and run from content_request.ts
- Define and export an `analyzerServer` using createSdkMcpServer with name "analyzer"
- Add a custom `extract_structure` tool using tool():
  - Accepts a `raw_text` string parameter (validated with zod)
  - Logs that it was called with the input length
  - Returns instructions telling the agent to organize the text into three categories: key_points, action_items, and decisions
  - Returns the raw_text_length and a text_preview (first 500 chars)
- Use query() with allowedTools: ["Read", "mcp__analyzer__extract_structure"]
- Accept file path as CLI arg, defaulting to `samples/meeting_notes.md`
- Use the shared SYSTEM_PROMPT + ANALYZER_PROMPT
- Set maxTurns to 5
- Stream the response and print each text block, print cost at the end

Add npm script: "analyze": "tsx content_analyzer.ts"
