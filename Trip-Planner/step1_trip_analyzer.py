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
from travel_request import TRAVEL_REQUEST, SYSTEM_PROMPT, run


async def main():

    # Configure the agent — just a system prompt and a single turn.
    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        max_turns=1,
    )

    # Stream the response and print each text block as it arrives.
    async for message in query(prompt=TRAVEL_REQUEST, options=options):

        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text)

        elif isinstance(message, ResultMessage):
            print(f"\nCost: ${message.total_cost_usd:.4f}")
            print(f"Duration: {message.duration_ms}ms")


run("STEP 1: Single Agent — Trip Request Analyzer", main(), "step1_output.md")
