# Step 2: Single Agent + Tool
# Same agent as Step 1, but now wired to an MCP server with one tool.
# The agent decides WHICH cities to research — we just give it the capability.

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    create_sdk_mcp_server,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, lookup_destination, run, save


# ── NEW: Tool instructions ──────────────────────────────

TOOL_INSTRUCTIONS = (
    " ALWAYS use the lookup_destination tool to research cities "
    "before making recommendations. Look up 2-3 cities, then give "
    "a structured trip brief with your top pick."
)


async def main():
    # ── NEW: Wrap our tool in an MCP server ──
    destination_server = create_sdk_mcp_server(name="travel_db", tools=[lookup_destination])

    # ── NEW: MCP server gives the agent a callable tool ──
    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT + TOOL_INSTRUCTIONS,
        mcp_servers={"travel_db": destination_server},
        allowed_tools=["mcp__travel_db__lookup_destination"],
        permission_mode="bypassPermissions",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(TRAVEL_REQUEST)
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        save(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"\n  ── Tool: {block.name}({block.input}) ──\n")
            elif isinstance(msg, ResultMessage):
                print(f"\n── Cost: ${msg.total_cost_usd:.4f} ──")


run(
    "STEP 2: Single Agent + Destination Lookup Tool",
    main(),
    "step2_output.md",
    subtitle="Adding a tool — the agent can now look up real destination data",
)
