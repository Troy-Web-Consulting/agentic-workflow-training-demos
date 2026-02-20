# Step 2: Single Agent + Tool
# Same agent as Step 1, but now wired to an MCP server with one tool.
# The agent decides WHICH cities to research — we just give it the capability.

from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from claude_agent_sdk import create_sdk_mcp_server
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, lookup_destination, run


def create_destination_server():
    return create_sdk_mcp_server(name="travel_db", tools=[lookup_destination])


async def main():
    destination_server = create_destination_server()

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT + (
            " ALWAYS use the lookup_destination tool to research cities "
            "before making recommendations. Look up 2-3 cities, then give "
            "a structured trip brief with your top pick."
        ),
        mcp_servers={"travel_db": destination_server},
        allowed_tools=["mcp__travel_db__lookup_destination"],
        permission_mode="bypassPermissions",
        max_turns=5,
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(TRAVEL_REQUEST)
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"\n  >> Tool call: lookup_destination({block.input})\n")
            elif isinstance(message, ResultMessage):
                print(f"\nCost: ${message.total_cost_usd:.4f} | Turns: {message.num_turns}")


run("STEP 2: Single Agent + Destination Lookup Tool", main(), "step2_output.md")
