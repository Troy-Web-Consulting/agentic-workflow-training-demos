Add budget tracking and enforcement to `workflow.ts`. This is the "final form" — the complete production-ready pipeline.

Modify `workflow.ts`:
- Parse command-line arguments to extract budget (e.g., `npm start --0.50` sets MAX_BUDGET_USD to 0.50)
- If no budget argument is provided, use readline to prompt the user: "Enter daily budget limit (USD, e.g., 0.50): "
- Store the MAX_BUDGET_USD from either the argument or user input
- Track cumulative cost across all agents using a cumulativeCostUsd variable
- After each agent's result message, add the agent's cost to the cumulative total
- Log cost after each agent: "[COST] Agent N cost: $X.XXXX | cumulative: $X.XXXX / $MAX_BUDGET_USD"
- Budget check after Agent 1 and Agent 2: if cumulative cost exceeds MAX_BUDGET_USD, display "[BUDGET EXCEEDED] Daily limit of $X.XX has been exceeded. Current spend: $X.XXXX"
- When budget is exceeded, use readline to prompt: "Would you like to continue? (yes/no): " — if user enters "no", save partial results, send Slack notification, and return; if "yes", continue processing
- Slack notification at the end includes the total cost
- Log at pipeline start: "[COST] Budget: $X.XX"
