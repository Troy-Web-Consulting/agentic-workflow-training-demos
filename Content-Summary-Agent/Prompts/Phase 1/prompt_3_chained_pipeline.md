Now update content_reader.ts to chain three agents together on a single session instead of running one agent.

Update `content_reader.ts` to:
- Replace the single query() call with three query() calls using the `resume` option to share session context
- Agent 1 (Content Reader): reads the document and summarizes it using READER_PROMPT
- Agent 2 (Analyzer): resumes Agent 1's session, uses ANALYZER_PROMPT to call extract_structure on the content from above
- Agent 3 (Brief Writer): resumes the same session, uses WRITER_PROMPT to produce a final professional brief

Add WRITER_PROMPT to content_request.ts: "You are a brief writer. Using all the information available in this conversation, produce a clean, professional brief with these sections: ## Summary, ## Key Points, ## Action Items, ## Decisions. Format action items with owner and deadline where available. Keep the entire brief under 500 words."

Create a shared processMessage() helper in content_request.ts that:
- Extracts and saves text blocks from assistant messages
- Logs tool use
- Prints cost from result messages
- Returns session_id from any message that has it

Capture session_id from Agent 1, pass it via `resume` to Agents 2 and 3.
