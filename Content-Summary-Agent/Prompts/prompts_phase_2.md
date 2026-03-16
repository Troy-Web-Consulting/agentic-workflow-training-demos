# Phase 2: Webhook Notification (Step 4)

Builds on Phase 1. The 3-agent pipeline is already working — now we add a real-world side effect.

**Prerequisite:** Phase 1 Steps 1-3 complete.

**Key concept:** Integrating external services (Slack webhook) into an agent pipeline.

---

## Step 4 — Slack Webhook

### Prompt

```
Add a Slack webhook notification to the pipeline.

Create `phase2/step4_with_webhook.ts`:
- Same 3-agent pipeline as Step 3 (Reader -> Analyzer -> Writer)
- After Agent 3 completes, capture the brief output text
- Add a sendSlackNotification() function that:
  - POSTs to a Slack webhook URL using native fetch()
  - Payload format: { text: "Content Summary Agent completed: <first 2-3 sentences>" }
  - Extract the first 2-3 sentences from the brief by stripping markdown headers, collapsing newlines, splitting on sentence boundaries, and taking the first 3 that are >10 chars
- Read webhook URL from SLACK_WEBHOOK_URL env var with a default fallback
- Default input file: samples/project_status.md

Add npm script: "step4": "tsx phase2/step4_with_webhook.ts"
```

### Expected Output (step4_output.md)

The 3-agent pipeline output plus a webhook confirmation. The brief covers the Project Phoenix status report:

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
