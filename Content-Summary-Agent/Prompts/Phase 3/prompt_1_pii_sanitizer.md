Add PII detection and redaction to the pipeline.

Create a new file `sanitizer.ts` with three exported functions:
- sanitizeInput(text): replaces emails, phone numbers, and SSNs with tagged placeholders like [EMAIL_REDACTED], [PHONE_REDACTED], [SSN_REDACTED] using regex
- sanitizeOutput(text): same redaction applied to agent output as a safety net
- detectPII(text): returns an array of { type, count } findings for logging/audit

Regex patterns:
- Email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
- Phone: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
- SSN: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g

Modify `workflow.ts` to integrate sanitization:
- PRE-PROCESSING: Before agents run, read the file with fs, call detectPII() to log findings, then sanitizeInput() the content
- Pass the sanitized content directly in Agent 1's prompt (instead of having the agent use Read)
- POST-PROCESSING: After Agent 3, call detectPII() on the output, and if any PII leaked through, call sanitizeOutput()
- Include a note in the Slack message about how many PII items were redacted
- Change the default input to samples/customer_feedback_report.md
