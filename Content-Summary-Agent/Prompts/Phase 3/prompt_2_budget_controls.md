Add budget tracking and enforcement to `workflow.ts`. This is the "final form" — the complete production-ready pipeline.

Modify `workflow.ts`:
- Add a MAX_BUDGET_USD constant (default: $0.50)
- Track cumulative cost across all agents using a cumulativeCostUsd variable
- After each agent's result message, add the agent's cost to the cumulative total
- Log cost after each agent: "[COST] Agent N cost: $X.XXXX | cumulative: $X.XXXX / $0.50"
- Budget check after Agent 1: if over budget, save partial results (reader output only), send Slack notification about early stop, and return
- Budget check after Agent 2: same pattern — save what we have and stop
- Slack notification at the end includes the total cost
- Log at pipeline start: "[COST] Budget: $0.50"
