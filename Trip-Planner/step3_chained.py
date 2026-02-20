# Step 3: Two Chained Agents (Analyst -> Itinerary Architect)
# ClaudeSDKClient keeps the session alive between queries.
# Agent 1 researches destinations. Agent 2 (same session, full context)
# drafts a day-by-day itinerary from those findings.

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, run
from step2_destination_tool import create_destination_server


async def main():
    destination_server = create_destination_server()

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT + (
            " When asked to build an itinerary, create a detailed day-by-day"
            " plan with morning/afternoon/evening activities, restaurant"
            " recommendations, and a running budget total."
        ),
        mcp_servers={"travel_db": destination_server},
        allowed_tools=["mcp__travel_db__lookup_destination"],
        permission_mode="bypassPermissions",
        max_turns=5,
    )

    async with ClaudeSDKClient(options=options) as client:

        # ── Agent 1: Trip Analyst ──
        print("\nAGENT 1: Researching destinations...")

        await client.query(
            "Analyze this travel request and look up your top 2 "
            f"destination recommendations:\n\n{TRAVEL_REQUEST}"
        )

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"\n  >> Tool call: lookup_destination({block.input})\n")
            elif isinstance(message, ResultMessage):
                print(f"\nAnalysis cost: ${message.total_cost_usd:.4f}")

        # ── Agent 2: Itinerary Architect (same session) ──
        print("\nAGENT 2: Building the itinerary...")

        await client.query(
            "Now build a detailed 5-day itinerary for your top recommendation. "
            "Include specific activities, restaurants (vegetarian-friendly!), "
            "and daily cost estimates with a running budget total."
        )

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
            elif isinstance(message, ResultMessage):
                print(f"\nItinerary cost: ${message.total_cost_usd:.4f}")
                print(f"Total turns: {message.num_turns}")


run("STEP 3: Two Chained Agents (Analyst -> Itinerary)", main(), "step3_output.md")
