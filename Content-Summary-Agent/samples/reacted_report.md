Let me fetch the `send_slack_summary` tool schema first.Here is the professional brief, and I'll post to Slack simultaneously.

---

## Summary
The Support Operations Team's March 2026 feedback report covers three escalated customer cases, NPS survey results, and five outstanding action items. Overall sentiment is improving (NPS 7.4, up from 7.1), but two customers present active churn risk tied to an unresolved export bug and recurring service outages.

## Key Points
- **Billing (Case #4201)** — Margaret Sullivan double-charged $2,400 in February; refund processed March 4. Second billing error in six months — systemic audit required
- **Export Bug (Case #4218)** — BUG-2855 causes analytics export timeouts on datasets >50K rows since March 1 release; Robert Jennings threatening cancellation by month-end
- **SSO Failure (Case #4225)** — SAML auth failing intermittently for ~200 DevNova users due to IdP clock skew; temporary fix live, permanent fix due in Sprint 14
- **NPS** — 847 responses; 34% Promoters, 41% Passives, 25% Detractors; praise for new dashboard and support speed; complaints around mobile UX, export bug, and outages
- **Churn risk** — Robert Jennings (SMB-10934) and Derek Arnold / FitSync both actively evaluating alternatives

## Decisions
- $2,400 refund approved and processed for Margaret Sullivan (March 4)
- SSO temporary fix deployed March 7 (expanded token validity to 5 min)
- API workaround accepted as interim solution for export issue
- Legacy SSN fields flagged for full CRM removal (compliance mandate)

## Action Items
| Owner | Task | Deadline |
|---|---|---|
| **Billing team** | Audit all Enterprise accounts for Feb duplicate charges | ASAP |
| **Backend team** | Fix BUG-2855 — export timeout on large datasets | End of March |
| **Auth team** | Ship permanent SSO clock-skew fix | Sprint 14 |
| **Support ops** | Remove legacy SSN fields from all flagged CRM records | March 31 |
| **Customer success** | Check-in calls with Robert Jennings & Derek Arnold | Before March 20 |

---

Now posting to Slack:The brief is complete, but the Slack post failed with a **404 error** — this typically means the webhook URL is misconfigured, expired, or pointing to a non-existent endpoint.

**To resolve this, you may want to:**
- Verify the Slack incoming webhook URL is active and correctly configured in the tool's settings
- Confirm the target Slack channel still exists and the webhook app has access
- Regenerate the webhook URL in Slack under **Apps → Incoming Webhooks** if it has expired

Once the webhook is fixed, the summary is ready to re-send with no changes needed.