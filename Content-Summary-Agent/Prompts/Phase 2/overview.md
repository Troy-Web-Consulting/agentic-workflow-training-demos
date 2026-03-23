# Phase 2: Slack Integration — Presenter Guide

## What We're Building

Adding a real-world side effect to the pipeline: a Slack webhook notification after the brief is generated. This modifies `workflow.ts` in place — no new orchestration file.

**Prerequisite:** Phase 1 complete (`content_reader.ts`, `content_analyzer.ts`, `workflow.ts` all working).

**Key concepts:** Integrating external services (Slack webhook), code-driven vs agent-driven side effects, Slack Block Kit.

---

## Timing Breakdown

| Segment | Duration | Cumulative |
|---------|----------|------------|
| Context / recap Phase 1 | 1-2 min | 1-2 min |
| Prompt 1: Slack Webhook | 5-6 min | 6-8 min |
| Discussion + Q&A | 3-5 min | 9-13 min |

---

## Prompt 1 — Slack Webhook

**File:** `prompt_1_slack_webhook.md` (copy/paste entire file into Claude Code)

**Time target:** 5-6 min (including discussion)

**Concepts introduced:**
- External service integration (Slack webhook via fetch)
- Environment variable configuration
- Post-pipeline side effects

**What to watch for while Claude Code executes:**
- It modifies `workflow.ts` in place — adds `sendSlackNotification()` function and calls it after Agent 3
- No new file is created — the webhook logic lives inside the existing orchestrator
- The notification extracts the first 2-3 sentences from the brief for a concise Slack message
- Default input changes to `samples/project_status.md` to show the pipeline works on different documents

**Discussion points:**
- "We added a real-world integration with zero changes to the agent logic"
- "The webhook is a post-pipeline side effect — agents don't know about it"
- "In production, you'd add retry logic and error handling around the webhook call"
- Ask: "What other side effects could you add here? (email, database, Jira ticket, etc.)"

### Expected Output

The 3-agent pipeline output plus a webhook confirmation at the end:

```markdown
[Agent 1: Reader summary of project_status.md]
[Agent 2: Structured extraction — key points, action items, decisions]

---

## Summary

Project Phoenix is **two weeks behind schedule** with a revised launch date of **April 7th** (originally March 24th). The PostgreSQL 16 migration is 80% complete and the primary cause of the delay. Two active blockers require immediate attention: an **SSL certificate expiring March 18th** and **Figma design token sync failures**. Three critical bugs were found this week, including a P1 security issue. Performance gains are strong (Redis caching cut API latency by 40%, CI/CD builds reduced from 12 to 7 min), and the project is **$12K under budget** YTD.

---

## Key Points

- **Timeline slipped 2 weeks** — PostgreSQL migration is the bottleneck; launch moved to April 7th
- **Frontend:** Onboarding redesign boosted conversion from 34% to 51% in staging; 8 accessibility violations remain
- **Backend:** Redis caching deployed — P95 latency dropped from 340ms to 195ms; rate limiting conflicting with webhook delivery
- **QA:** Test coverage at 74% (target 85%); 3 critical bugs found including a checkout race condition and a P1 password reset vulnerability
- **DevOps:** Build times cut from 12 to 7 min; SSL cert renewal blocked by DNS validation (expires March 18)
- **Design:** Mobile checkout redesign complete; user testing scheduled March 13-14
- **Budget:** $12K under budget YTD

---

## Action Items

| # | Owner | Task | Deadline |
|---|-------|------|----------|
| 1 | Sam Kowalski | Resolve SSL cert DNS validation or switch to HTTP fallback | March 15 (hard: March 18) |
| 2 | Alex Turner | Resolve Figma token sync or manually extract tokens | Friday |
| 3 | James Morgan | Fix rate limiting bypass for trusted webhook sources | End of week |
| 4 | James Morgan | Complete PostgreSQL migration + schedule maintenance window | March 15 |
| 5 | Nina Chen / James | Investigate BUG-2847 (checkout race condition) | TBD |
| 6 | Backend team | Fix BUG-2851 (password reset email P1) | ASAP |
| 7 | Rachel Adams | Approve Kubernetes conference budget ($3,200) | TBD |
| 8 | Rachel Adams | Approve contract technical writer ($5,000) | TBD |

---

## Decisions

- Launch date revised to **April 7th**
- Maintenance window proposed for **Saturday 2am-4am ET** for DB cutover
- Fallback plan for design tokens: manual extraction if Figma plugin not fixed by Friday
- PagerDuty on-call rotation starts next Monday

---

[Webhook] Sending Slack notification...
[Webhook] Slack notification sent successfully.
```

---

## Step 4b — Slack as an Agent-Callable Tool (Block Kit)

### Teaching Notes

This step makes a conceptual shift the audience should understand:

- **Step 4**: Your code calls Slack after the pipeline finishes. The agent doesn't know Slack exists.
- **Step 4b**: The agent has a tool and decides to call Slack itself. The agent is now taking real-world actions.

Walk through the `send_slack_summary` tool definition and point out:
- The structured input schema (title, summary, key_points, action_items) — the agent must organize its output to match
- The Block Kit payload — regular code that builds a rich message format
- The agent's updated prompt that tells it to use the tool — the agent decides what to include

Compare the two Slack messages side by side: Step 4's plain text vs Step 4b's Block Kit formatting.

### Expected Output (step4b_output.md)

The 3-agent pipeline output plus the agent calling the Slack tool itself. The brief covers the Project Phoenix status report, same content as Step 4, but the Slack message now appears as a rich Block Kit message in the channel:

```markdown
[Agent 1: Reader summary of project_status.md]
[Agent 2: Structured extraction — key points, action items, decisions]

---

## Summary

Project Phoenix is **two weeks behind schedule** with a revised launch date of **April 7th** (originally March 24th). The PostgreSQL 16 migration is 80% complete and the primary cause of the delay. Two active blockers require immediate attention: an **SSL certificate expiring March 18th** and **Figma design token sync failures**. Three critical bugs were found this week, including a P1 security issue. Performance gains are strong (Redis caching cut API latency by 40%, CI/CD builds reduced from 12 to 7 min), and the project is **$12K under budget** YTD.

---

## Key Points

- **Timeline slipped 2 weeks** — PostgreSQL migration is the bottleneck; launch moved to April 7th
- **Frontend:** Onboarding redesign boosted conversion from 34% to 51% in staging; 8 accessibility violations remain
- **Backend:** Redis caching deployed — P95 latency dropped from 340ms to 195ms; rate limiting conflicting with webhook delivery
- **QA:** Test coverage at 74% (target 85%); 3 critical bugs found including a checkout race condition and a P1 password reset vulnerability
- **DevOps:** Build times cut from 12 to 7 min; SSL cert renewal blocked by DNS validation (expires March 18)
- **Design:** Mobile checkout redesign complete; user testing scheduled March 13-14
- **Budget:** $12K under budget YTD

---

## Action Items

| # | Owner | Task | Deadline |
|---|-------|------|----------|
| 1 | Sam Kowalski | Resolve SSL cert DNS validation or switch to HTTP fallback | March 15 (hard: March 18) |
| 2 | Alex Turner | Resolve Figma token sync or manually extract tokens | Friday |
| 3 | James Morgan | Fix rate limiting bypass for trusted webhook sources | End of week |
| 4 | James Morgan | Complete PostgreSQL migration + schedule maintenance window | March 15 |
| 5 | Nina Chen / James | Investigate BUG-2847 (checkout race condition) | TBD |
| 6 | Backend team | Fix BUG-2851 (password reset email P1) | ASAP |
| 7 | Rachel Adams | Approve Kubernetes conference budget ($3,200) | TBD |
| 8 | Rachel Adams | Approve contract technical writer ($5,000) | TBD |

---

## Decisions

- Launch date revised to **April 7th**
- Maintenance window proposed for **Saturday 2am-4am ET** for DB cutover
- Fallback plan for design tokens: manual extraction if Figma plugin not fixed by Friday
- PagerDuty on-call rotation starts next Monday

---

  -- Tool: send_slack_summary(...) --

  >> send_slack_summary tool called
  >> Title: Project Phoenix - Weekly Status Update
  >> Key points: 7, Action items: 8

[Webhook] Slack notification sent successfully.

Slack notification sent successfully.
```

The Slack channel shows a rich Block Kit message with:
- **Header**: "Project Phoenix - Weekly Status Update"
- **Summary section**: 2-3 sentence overview
- **Key Points section**: Bulleted list
- **Action Items section**: Bulleted list
- **Context footer**: "Posted by Content Summary Agent | [timestamp]"

---

## Transition to Phase 3

**Talking point:** "The pipeline works end-to-end now — reads, analyzes, writes, and notifies. But would you ship this to production? What's missing?"

Expected answers: error handling, logging, cost controls, PII protection — which is exactly what Phase 3 covers.
