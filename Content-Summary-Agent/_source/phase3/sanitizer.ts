/**
 * PII detection and redaction utilities.
 *
 * In production you'd use a proper NER model (e.g. spaCy, Presidio, or a
 * cloud NLP service) for name detection. The regex-based approach here
 * handles the common structured patterns — emails, phones, SSNs.
 */

// -- Regex Patterns -----------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const SSN_RE = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;

// -- Sanitize Functions -------------------------------------------------------

/**
 * Redact PII from text before sending to the agent.
 * Replaces detected patterns with tagged placeholders.
 */
export function sanitizeInput(text: string): string {
  let sanitized = text;

  sanitized = sanitized.replace(EMAIL_RE, "[EMAIL_REDACTED]");
  sanitized = sanitized.replace(SSN_RE, "[SSN_REDACTED]");
  sanitized = sanitized.replace(PHONE_RE, "[PHONE_REDACTED]");

  // Name detection placeholder:
  // In production, use NER (Named Entity Recognition) here.
  // e.g. const entities = await nerModel.detect(sanitized);
  //      for (const entity of entities.filter(e => e.type === 'PERSON')) {
  //        sanitized = sanitized.replaceAll(entity.text, '[NAME_REDACTED]');
  //      }

  return sanitized;
}

/**
 * Redact PII from agent output as a safety net.
 * Catches any PII the agent may have generated or echoed back.
 */
export function sanitizeOutput(text: string): string {
  let sanitized = text;

  sanitized = sanitized.replace(EMAIL_RE, "[EMAIL_REDACTED]");
  sanitized = sanitized.replace(SSN_RE, "[SSN_REDACTED]");
  sanitized = sanitized.replace(PHONE_RE, "[PHONE_REDACTED]");

  return sanitized;
}

/**
 * Report what was redacted (for logging/audit purposes).
 */
export function detectPII(text: string): { type: string; count: number }[] {
  const findings: { type: string; count: number }[] = [];

  const emails = text.match(EMAIL_RE);
  if (emails) findings.push({ type: "email", count: emails.length });

  const phones = text.match(PHONE_RE);
  if (phones) findings.push({ type: "phone", count: phones.length });

  const ssns = text.match(SSN_RE);
  if (ssns) findings.push({ type: "ssn", count: ssns.length });

  return findings;
}
