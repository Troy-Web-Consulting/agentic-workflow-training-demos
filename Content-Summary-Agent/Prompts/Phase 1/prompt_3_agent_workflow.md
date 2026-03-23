Create a new file `workflow.ts` that chains three agents together on a single session.

Add a shared processMessage() helper to content_request.ts that:
- Extracts and saves text blocks from assistant messages
- Logs tool use
- Prints cost from result messages
- Returns session_id from any message that has it

Add WRITER_PROMPT to content_request.ts: "You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words."

Create `workflow.ts`:
- Import query from the SDK
- Import SYSTEM_PROMPT, READER_PROMPT, ANALYZER_PROMPT, WRITER_PROMPT, processMessage, and run from content_request.ts
- Import analyzerServer from content_analyzer.ts
- Accept file path as CLI arg, defaulting to `samples/meeting_notes.md`
- Chain three query() calls using the `resume` option to share session context:
  - Agent 1 (Content Reader): reads the document using READER_PROMPT with allowedTools: ["Read"], maxTurns: 3
  - Agent 2 (Analyzer): resumes Agent 1's session, uses ANALYZER_PROMPT, allowedTools: ["Read", "mcp__analyzer__extract_structure"], maxTurns: 5
  - Agent 3 (Brief Writer): resumes the same session, uses WRITER_PROMPT, allowedTools: [], maxTurns: 1
- Capture session_id from Agent 1, pass it via `resume` to Agents 2 and 3
- Use processMessage() to handle all agent responses

Update the npm "start" script to: "tsx workflow.ts"
