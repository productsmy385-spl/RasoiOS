import { PrintJobStatus } from "@prisma/client";
import { ConflictError } from "@/lib/errors";

/**
 * PRINT_JOB state machine (S1-P16-T001, architecture.md §6.3, ADR-007 §3–4). Pure functions — no database, no clock
 * beyond the instant the caller passes in — so the queue's rules are unit-testable on their own.
 *
 *   PENDING    → PROCESSING (agent claim, lease 60 s, attempt + 1)
 *   PENDING    → FAILED     (printer deactivated)
 *   PROCESSING → PRINTED    (agent ack PRINTED — the only path to PRINTED, BR-PRINT-01)
 *   PROCESSING → PENDING    (ack FAILED with attempts left, or an expired lease returning the job to the queue)
 *   PROCESSING → FAILED     (ack FAILED at max attempts)
 *   FAILED     → PENDING    (staff retry, attempts reset)
 *   PRINTED    → —          (terminal)
 */
export const PRINT_JOB_TRANSITIONS: Readonly<Record<PrintJobStatus, readonly PrintJobStatus[]>> = {
  PENDING: [PrintJobStatus.PROCESSING, PrintJobStatus.FAILED],
  PROCESSING: [PrintJobStatus.PRINTED, PrintJobStatus.PENDING, PrintJobStatus.FAILED],
  PRINTED: [],
  FAILED: [PrintJobStatus.PENDING],
};

export function canTransition(from: PrintJobStatus, to: PrintJobStatus): boolean {
  return PRINT_JOB_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PrintJobStatus, to: PrintJobStatus): void {
  if (!canTransition(from, to)) throw new ConflictError(`A ${from.toLowerCase()} print job cannot become ${to.toLowerCase()}.`, "INVALID_TRANSITION");
}

/** Lease length of one claim (ADR-007 §3). An expired lease makes the job claimable again. */
export const LEASE_MS = 60_000;

/** First retry after 10 s, then 20 s, 40 s … (ADR-007 §4). `attemptCount` is the count *after* the failed attempt. */
export const RETRY_BASE_MS = 10_000;

export function backoffMs(attemptCount: number): number {
  const exponent = Math.max(0, Math.min(attemptCount, 10) - 1);
  return RETRY_BASE_MS * 2 ** exponent;
}

export function nextAttemptAt(at: Date, attemptCount: number): Date {
  return new Date(at.getTime() + backoffMs(attemptCount));
}

/** What an agent's FAILED acknowledgement does: retry with backoff while attempts remain, otherwise terminal FAILED. */
export function outcomeOfFailure(attemptCount: number, maxAttempts: number, at: Date): { status: PrintJobStatus; nextAttemptAt: Date | null } {
  return attemptCount < maxAttempts
    ? { status: PrintJobStatus.PENDING, nextAttemptAt: nextAttemptAt(at, attemptCount) }
    : { status: PrintJobStatus.FAILED, nextAttemptAt: null };
}

/** Error codes the server itself records (agents send their own, capped and sanitised on the way in). */
export const PRINT_ERROR_CODES = {
  PRINTER_DEACTIVATED: "PRINTER_DEACTIVATED",
  LEASE_EXPIRED: "LEASE_EXPIRED",
} as const;
