const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const SSN_REGEX = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;

interface PIIFinding {
  type: string;
  count: number;
}

export function detectPII(text: string): PIIFinding[] {
  const findings: PIIFinding[] = [];

  const emails = text.match(EMAIL_REGEX);
  if (emails) findings.push({ type: 'EMAIL', count: emails.length });

  const phones = text.match(PHONE_REGEX);
  if (phones) findings.push({ type: 'PHONE', count: phones.length });

  const ssns = text.match(SSN_REGEX);
  if (ssns) findings.push({ type: 'SSN', count: ssns.length });

  return findings;
}

function redact(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(PHONE_REGEX, '[PHONE_REDACTED]')
    .replace(SSN_REGEX, '[SSN_REDACTED]');
}

export function sanitizeInput(text: string): string {
  return redact(text);
}

export function sanitizeOutput(text: string): string {
  return redact(text);
}
