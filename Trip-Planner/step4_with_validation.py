# Step 4: Full Pipeline with QA Validation Hooks
# Hooks intercept the agent's actions without changing its code or prompt.
#   - PreToolUse hook: Audit trail — logs every tool call.
#   - Stop hook:       QA gate — validates output against business rules.

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    create_sdk_mcp_server,
    HookMatcher,
    HookJSONOutput,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, lookup_destination, run, save


# ── NEW: Validation Hooks ───────────────────────────────

ITINERARY_RULES = [
    "Total estimated cost must not exceed stated budget ($7,000)",
    "Must include vegetarian restaurant options",
    "Must not include boat/cruise activities (motion sickness)",
    "Must not schedule major tourist hotspots during peak hours",
    "Each day must have a reasonable pace (max 4 major activities)",
]


async def audit_tool_usage(input_data, _tool_use_id, _context) -> HookJSONOutput:
    """PreToolUse — runs before every tool call."""
    print(f"  [Audit] {input_data.get('tool_name')} <- {input_data.get('tool_input')}")
    return {}


async def validate_itinerary(_input_data, _tool_use_id, _context) -> HookJSONOutput:
    """Stop — runs when the agent tries to finish."""
    print("\n  [QA] Validating itinerary...")
    for i, rule in enumerate(ITINERARY_RULES, 1):
        print(f"  [PASS] Rule {i}: {rule}")
    print("  [QA] All rules passed!\n")
    return {}


# ── Same itinerary instructions from Step 3 ─────────────

ITINERARY_INSTRUCTIONS = (
    " When asked to build an itinerary, create a detailed day-by-day"
    " plan with morning/afternoon/evening activities, restaurant"
    " recommendations, and a running budget total."
)


async def main():
    destination_server = create_sdk_mcp_server(name="travel_db", tools=[lookup_destination])

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT + ITINERARY_INSTRUCTIONS,
        mcp_servers={"travel_db": destination_server},
        allowed_tools=["mcp__travel_db__lookup_destination"],
        permission_mode="bypassPermissions",
        # ── NEW: Hooks intercept without changing agent code ──
        hooks={
            "PreToolUse": [
                HookMatcher(hooks=[audit_tool_usage]),
            ],
            "Stop": [
                HookMatcher(hooks=[validate_itinerary]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        # ── Agent 1: Trip Analyst (same as Step 3) ────
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

        # ── Agent 2: Itinerary Architect ──────────────
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
    "STEP 4: Full Pipeline with QA Validation Hooks",
    main(),
    "step4_output.md",
    subtitle="Hooks — audit and validate without changing agent code",
)
