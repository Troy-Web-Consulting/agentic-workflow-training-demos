/**
 * Structured logging utility for the production pipeline.
 * Labels: PIPELINE, SANITIZER, AGENT, COST, WEBHOOK, ERROR
 */

export function log(label: string, message: string): void {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`[${time}] [${label}] ${message}`);
}
