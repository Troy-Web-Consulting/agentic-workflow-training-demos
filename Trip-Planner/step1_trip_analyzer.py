# Step 1: Single Agent
# One query() call — the simplest possible agent.
# No tools, no chaining — just a system prompt and a single LLM turn.

from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
)
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, run, save


async def main():
    # Configure the agent — just a system prompt and a single turn.
    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
    )

    # Stream the response and print each block as it arrives.
    async for msg in query(prompt=TRAVEL_REQUEST, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    save(block.text)
        elif isinstance(msg, ResultMessage):
            print(f"\n── Cost: ${msg.total_cost_usd:.4f} ──")


run(
    "STEP 1: Single Agent — Trip Request Analyzer",
    main(),
    "step1_output.md",
    subtitle="A single LLM call with a system prompt — no tools, no chaining",
)
