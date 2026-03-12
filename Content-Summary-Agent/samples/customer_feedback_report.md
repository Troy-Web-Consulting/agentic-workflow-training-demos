# Customer Feedback Summary — March 2026

Compiled by: Support Operations Team

---

## Escalated Issues

### Case #4201 — Billing Discrepancy
Customer: Margaret Sullivan
Email: margaret.sullivan@techcorp.com
Phone: (312) 555-7829
Account #: ENT-40821

Margaret reported being double-charged for the Enterprise plan in February. Finance confirmed the duplicate charge of $2,400. Refund processed on 3/4. She also requested that future invoices be sent to accounting@techcorp.com instead of her personal inbox. Margaret was satisfied with the resolution but noted this is the second billing error in six months.

### Case #4218 — Data Export Failure
Customer: Robert Jennings
Email: r.jennings@orbitlabs.io
Phone: 628-555-0143
SSN on file (legacy field, flagged for removal): 471-83-2295
Account #: SMB-10934

Robert's team has been unable to export analytics data since the March 1st release. The export times out after 10 minutes on datasets over 50K rows (relates to BUG-2855). Workaround: his team is pulling data via API, but Robert says this is costing them 3 engineering hours per week. He's threatening to cancel if not fixed by end of month.

### Case #4225 — SSO Configuration
Customer: DevNova Inc. (contact: Aisha Patel)
Email: aisha.p@devnova.dev
Phone: +1-415-555-3901
Account #: ENT-40955

SAML SSO integration failing intermittently — affects ~200 users at DevNova. Auth team identified the issue as clock skew between our IdP and theirs. Temp fix deployed 3/7 (increased token validity window to 5 minutes). Permanent fix in Sprint 14. Aisha requested a direct line to our engineering team for future SSO issues; for now she can reach the auth team lead at sso-support@phoenix-internal.com or 510-555-0188.

## NPS Survey Highlights (March 1–10)

Responses: 847 | Avg Score: 7.4 (up from 7.1 in Feb)

**Promoters (score 9-10):** 34%
> "The new dashboard is a massive improvement. Our team lives in the analytics view now." — survey respondent (enterprise, anon)

> "Support response time has been excellent. Got a call back from 800-555-0127 within 20 minutes of filing my ticket." — Jennifer Mosley, jmosley@crestview.org

**Passives (score 7-8):** 41%
> "Product is solid but the mobile experience needs work. Hard to review reports on my phone."

**Detractors (score 0-6):** 25%
> "We've had three outages in the past month. Starting to evaluate alternatives. Contact me to discuss — darnold@fitsync.co, 773-555-6214" — Derek Arnold, FitSync

> "The export bug is killing us. Please see case #4218." — Robert Jennings

## Action Items

1. **Billing team**: Audit all Enterprise accounts for duplicate charges in Feb cycle. Contact: finance-ops@phoenix-internal.com
2. **Backend team**: Prioritize BUG-2855 (export truncation) — multiple customers affected, churn risk
3. **Auth team**: Ship permanent SSO clock-skew fix in Sprint 14
4. **Support ops**: Remove legacy SSN fields from customer records (compliance req, deadline March 31). Affected records flagged in the CRM — contact compliance@phoenix-internal.com or call 510-555-0199 for the removal procedure
5. **Customer success**: Schedule check-in calls with Robert Jennings and Derek Arnold before March 20
