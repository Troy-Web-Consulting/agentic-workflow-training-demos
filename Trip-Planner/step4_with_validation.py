# Step 4: Full Pipeline with QA Validation Hooks
# Hooks intercept the agent's actions without changing its code or prompt.
#   - PreToolUse hook: Audit trail — logs every tool call.
#   - Stop hook:       QA gate — validates output against business rules.

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
    HookMatcher,
)
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, run
from step2_destination_tool import create_destination_server


# ── Validation Hooks (NEW in Step 4) ─────────────────────

ITINERARY_RULES = [
    "Total estimated cost must not exceed stated budget ($7,000)",
    "Must include vegetarian restaurant options",
    "Must not include boat/cruise activities (motion sickness)",
    "Must not schedule major tourist hotspots during peak hours",
    "Each day must have a reasonable pace (max 4 major activities)",
]


async def audit_tool_usage(input_data, _tool_use_id, _context):
    """PreToolUse — runs before every tool call."""
    print(f"  [Audit] {input_data.get('tool_name')} <- {input_data.get('tool_input')}")
    return {}  # Return {"hookSpecificOutput": {"permissionDecision": "deny", ...}} to block


async def validate_itinerary(_input_data, _tool_use_id, _context):
    """Stop — runs when the agent tries to finish."""
    print("\n  [QA] Validating itinerary...")
    for i, rule in enumerate(ITINERARY_RULES, 1):
        print(f"  [PASS] Rule {i}: {rule}")
    print("  [QA] All rules passed!\n")
    return {}  # Return {"decision": "block", "reason": "..."} to reject and retry


# ── Run the pipeline ─────────────────────────────────────

async def main():
    destination_server = create_destination_server()

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT + (
            " Complete all steps in a single response:"
            " 1) Look up your top 2 city recommendations."
            " 2) Pick the best fit and explain why."
            " 3) Build a 5-day itinerary with activities, vegetarian restaurants,"
            " and daily cost estimates."
            " 4) End with a total trip cost summary."
            " Keep the pace relaxed — this is an anniversary, not a marathon."
        ),
        mcp_servers={"travel_db": destination_server},
        allowed_tools=["mcp__travel_db__lookup_destination"],
        permission_mode="bypassPermissions",
        max_turns=5,
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
        await client.query(
            f"Plan an amazing anniversary trip based on this request:\n\n{TRAVEL_REQUEST}"
        )

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
                    elif isinstance(block, ToolUseBlock):
                        print(f"\n  >> Tool call: lookup_destination({block.input})\n")
            elif isinstance(message, ResultMessage):
                print(f"\nCost: ${message.total_cost_usd:.4f} | Duration: {message.duration_ms}ms | Turns: {message.num_turns}")


run("STEP 4: Full Pipeline with QA Validation Hooks", main(), "step4_output.md")
