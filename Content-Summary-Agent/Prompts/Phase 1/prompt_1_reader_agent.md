Create a Content Summary Agent using the Claude Agent SDK (@anthropic-ai/claude-agent-sdk).

Set up the project:
- Initialize with npm, TypeScript, and tsx for execution
- Install @anthropic-ai/claude-agent-sdk and zod
- Create a tsconfig.json targeting ESNext with module NodeNext

Create a shared module `content_request.ts` with:
- A SYSTEM_PROMPT: "You are a content analysis specialist. Read documents and extract key information clearly and concisely. Use bullet points over paragraphs, skip filler, and aim for under 400 words."
- A READER_PROMPT: instructions to read a document, identify main topics, decisions, and action items, using the Read tool
- A `save()` function that logs text and appends to a buffer
- A `run()` function that wraps an async main, prints a header, and writes the buffer to an Outputs directory

Create `content_reader.ts`:
- A single agent that uses query() with the built-in Read tool
- Accepts a file path as CLI arg, defaulting to `samples/meeting_notes.md`
- Streams the response and prints each text block
- Prints cost at the end
- Uses the shared SYSTEM_PROMPT + READER_PROMPT
- Set maxTurns to 3

Add npm script: "start": "tsx content_reader.ts"
