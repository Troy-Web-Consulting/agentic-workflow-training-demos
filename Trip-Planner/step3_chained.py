# Step 3: Two Chained Agents (Analyst -> Itinerary Architect)
# ClaudeSDKClient keeps the session alive between queries.
# Agent 1 researches destinations. Agent 2 (same session, full context)
# drafts a day-by-day itinerary from those findings.

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    create_sdk_mcp_server,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, lookup_destination, run, save


# ── NEW: Itinerary instructions for the second agent ────

ITINERARY_INSTRUCTIONS = (
    " When asked to build an itinerary, create a detailed day-by-day"
    " plan with morning/afternoon/evening activities, restaurant"
    " recommendations, and a running budget total."
)


async def main():
    # ── Setup (same as before) ──────────────────────────
    destination_server = create_sdk_mcp_server(name="travel_db", tools=[lookup_destination])

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT + ITINERARY_INSTRUCTIONS,
        mcp_servers={"travel_db": destination_server},
        allowed_tools=["mcp__travel_db__lookup_destination"],
        permission_mode="bypassPermissions",
    )

    # ── NEW: Two queries on the same session ────────────
    async with ClaudeSDKClient(options=options) as client:
        # ── Agent 1: Trip Analyst ───────────────────────
        print("\n>> Agent 1: Researching destinations...\n")

        await client.query(
            "Analyze this travel request and look up your top 2 "
            f"destination recommendations:\n\n{TRAVEL_REQUEST}"
        )

        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        save(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"\n  ── Tool: {block.name}({block.input}) ──\n")
            elif isinstance(msg, ResultMessage):
                print(f"\n── Agent 1 cost: ${msg.total_cost_usd:.4f} ──")

        # ── Agent 2: Itinerary Architect ────────────────
        print("\n>> Agent 2: Building the itinerary...\n")

        await client.query(
            "Now build a detailed 5-day itinerary for your top recommendation. "
            "Include specific activities, restaurants (vegetarian-friendly!), "
            "and daily cost estimates with a running budget total."
        )
        
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        save(block.text)
            elif isinstance(msg, ResultMessage):
                print(f"\n── Agent 2 cost: ${msg.total_cost_usd:.4f} ──")


run(
    "STEP 3: Two Chained Agents (Analyst -> Itinerary)",
    main(),
    "step3_output.md",
    subtitle="Chaining two queries on one session — Agent 2 sees Agent 1's work",
)
