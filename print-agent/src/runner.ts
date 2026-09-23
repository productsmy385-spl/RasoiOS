import { parsePrintDocument } from "@/lib/print/types";
import { AgentApiError, type AckBody, type AgentApiLike, type AgentPrinter, type ClaimedJob, type PrinterHealthValue } from "./api";
import { encodeDocument } from "./escpos";
import type { PrintedJournal } from "./journal";
import type { Logger } from "./logger";
import { PrintTransportError, type Transport } from "./transports";
import { AGENT_VERSION } from "./version";

/**
 * The poll → claim → print → acknowledge loop (S1-P17-T004, ADR-007 §3–§7).
 *
 * - Heartbeat (with each printer's probed health) and a config refresh every `heartbeatIntervalMs` (server: 30 s).
 * - Claim one job at a time. When a job came back, claim again straight away; when the queue is empty, wait the poll
 *   interval (3 s ± 1 s jitter), backing off to 15 s after 10 empty polls. One job per claim keeps every lease short:
 *   a slow printer can never hold ten leases until they expire under it.
 * - Network or server failure: exponential backoff 1 s → 60 s. 429: wait what the server says.
 * - 401: the token was revoked — stop with {@link FatalAgentError}; the service manager must not restart-loop on it.
 * - The journal is checked before printing and written before acknowledging (at-least-once with duplicate mitigation).
 * - Stop requests are honoured between jobs, so an in-flight ticket always finishes.
 */
export const EMPTY_POLLS_BEFORE_BACKOFF = 10;
export const IDLE_POLL_MS = 15_000;
export const MAX_NETWORK_BACKOFF_MS = 60_000;
const ACK_ATTEMPTS = 4;

export class FatalAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalAgentError";
  }
}

export type RunnerDeps = {
  api: AgentApiLike;
  journal: PrintedJournal;
  logger: Logger;
  transportFor: (printer: AgentPrinter) => Transport;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
};

type Health = { health: PrinterHealthValue; detail?: string };

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class PrintAgentRunner {
  readonly printers = new Map<string, AgentPrinter>();
  readonly health = new Map<string, Health>();
  pollIntervalMs = 3_000;
  heartbeatIntervalMs = 30_000;
  private emptyPolls = 0;
  private networkFailures = 0;
  private nextHeartbeatAt = 0;

  private readonly now: () => number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly random: () => number;

  constructor(private readonly deps: RunnerDeps) {
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? abortableSleep;
    this.random = deps.random ?? Math.random;
  }

  /** Runs until `signal` aborts. Throws {@link FatalAgentError} when the agent must be re-paired. */
  async run(signal: AbortSignal): Promise<void> {
    this.deps.logger.info("agent.started", { version: AGENT_VERSION });
    while (!signal.aborted) {
      const delay = await this.cycle();
      if (delay > 0) await this.sleep(delay, signal);
    }
    this.deps.logger.info("agent.stopped");
  }

  /** One iteration: heartbeat when due, then one claim. Returns how long to wait before the next iteration. */
  async cycle(): Promise<number> {
    try {
      if (this.now() >= this.nextHeartbeatAt) {
        await this.heartbeat();
        this.nextHeartbeatAt = this.now() + this.heartbeatIntervalMs;
      }
      const { jobs } = await this.deps.api.claim(1);
      this.networkFailures = 0;
      if (jobs.length > 0) {
        this.emptyPolls = 0;
        for (const job of jobs) await this.process(job);
        return 0;
      }
      this.emptyPolls += 1;
      if (this.emptyPolls >= EMPTY_POLLS_BEFORE_BACKOFF) return IDLE_POLL_MS;
      return Math.max(250, this.pollIntervalMs + Math.round((this.random() * 2 - 1) * 1_000));
    } catch (error) {
      return this.failureDelay(error);
    }
  }

  private failureDelay(error: unknown): number {
    if (error instanceof AgentApiError) {
      if (error.kind === "AUTH") throw new FatalAgentError("The server rejected this agent's token (revoked or replaced). Pair the agent again.");
      if (error.kind === "RATE_LIMITED") {
        this.deps.logger.warn("agent.rate_limited", { retryAfterMs: error.retryAfterMs });
        return error.retryAfterMs ?? 30_000;
      }
    }
    this.networkFailures += 1;
    const delay = Math.min(MAX_NETWORK_BACKOFF_MS, 1_000 * 2 ** (this.networkFailures - 1));
    this.deps.logger.warn("agent.server_unavailable", {
      kind: error instanceof AgentApiError ? error.kind : "UNKNOWN",
      status: error instanceof AgentApiError ? error.status : null,
      consecutiveFailures: this.networkFailures,
      retryInMs: delay,
    });
    // Force a heartbeat as soon as the server is back, so the console sees the agent again immediately.
    this.nextHeartbeatAt = 0;
    return delay;
  }

  /** Refreshes the printer list from RH-AGT-05 and reports each printer's probed health through RH-AGT-02. */
  async heartbeat(): Promise<void> {
    await this.refreshConfig();
    await Promise.all([...this.printers.values()].map((printer) => this.probe(printer)));
    const reply = await this.deps.api.heartbeat({
      agentVersion: AGENT_VERSION,
      printers: [...this.printers.keys()].map((printerId) => {
        const state = this.health.get(printerId) ?? { health: "UNKNOWN" as const };
        return { printerId, health: state.health, ...(state.detail ? { detail: state.detail.slice(0, 120) } : {}) };
      }),
    });
    this.applyIntervals(reply);
  }

  async refreshConfig(): Promise<void> {
    const config = await this.deps.api.config();
    this.printers.clear();
    for (const printer of config.printers) this.printers.set(printer.printerId, printer);
    for (const printerId of [...this.health.keys()]) if (!this.printers.has(printerId)) this.health.delete(printerId);
    this.applyIntervals(config);
  }

  private applyIntervals(values: { pollIntervalMs: number; heartbeatIntervalMs: number }): void {
    this.pollIntervalMs = clamp(values.pollIntervalMs, 1_000, 60_000);
    this.heartbeatIntervalMs = clamp(values.heartbeatIntervalMs, 5_000, 300_000);
  }

  private async probe(printer: AgentPrinter): Promise<void> {
    try {
      await this.deps.transportFor(printer).probe();
      this.health.set(printer.printerId, { health: "ONLINE" });
    } catch (error) {
      this.health.set(printer.printerId, healthFromError(error));
    }
  }

  async process(job: ClaimedJob): Promise<void> {
    const { logger, journal } = this.deps;
    const ctx = { jobId: job.jobId, printerId: job.printerId, jobType: job.jobType, attempt: job.attemptCount };

    if (journal.has(job.jobId)) {
      // Printed before a crash or a lost acknowledgement: confirm it, do not print a second ticket (TC-AGENT-008).
      logger.info("job.already_printed", ctx);
      await this.acknowledge(job, { result: "PRINTED" });
      return;
    }

    let bytes: Buffer;
    try {
      bytes = encodeDocument(parsePrintDocument(job.payload));
    } catch {
      logger.error("job.invalid_payload", ctx);
      await this.acknowledge(job, { result: "FAILED", errorCode: "INVALID_PAYLOAD", errorMessage: "The agent could not read this ticket." });
      return;
    }

    let printer = this.printers.get(job.printerId);
    if (!printer) {
      await this.refreshConfig().catch(() => undefined);
      printer = this.printers.get(job.printerId);
    }
    if (!printer) {
      logger.error("job.unknown_printer", ctx);
      await this.acknowledge(job, { result: "FAILED", errorCode: "UNKNOWN_PRINTER", errorMessage: "This printer is not assigned to this agent." });
      return;
    }

    try {
      await this.deps.transportFor(printer).send(bytes);
    } catch (error) {
      const state = healthFromError(error);
      this.health.set(printer.printerId, state);
      const code = error instanceof PrintTransportError ? error.code : "PRINT_FAILED";
      logger.warn("job.print_failed", { ...ctx, code });
      await this.acknowledge(job, { result: "FAILED", errorCode: code, errorMessage: (state.detail ?? "Printing failed").slice(0, 500) });
      return;
    }

    try {
      await journal.record(job.jobId);
    } catch {
      // The ticket is on paper; still acknowledge it. Only a crash before the ack could now cause a duplicate.
      logger.error("journal.write_failed", ctx);
    }
    this.health.set(printer.printerId, { health: "ONLINE" });
    logger.info("job.printed", { ...ctx, bytes: bytes.length });
    await this.acknowledge(job, { result: "PRINTED" });
  }

  /**
   * Acknowledges with a few quick retries. If it still cannot get through, the lease expires, the job is re-claimed and
   * the journal turns that into a plain acknowledgement. 409 means the lease was lost to another claim — nothing to do.
   */
  private async acknowledge(job: ClaimedJob, result: Omit<AckBody, "claimToken">): Promise<void> {
    for (let attempt = 1; attempt <= ACK_ATTEMPTS; attempt++) {
      try {
        const reply = await this.deps.api.ack(job.jobId, { claimToken: job.claimToken, ...result });
        this.deps.logger.info("job.acknowledged", { jobId: job.jobId, result: result.result, status: reply.status });
        return;
      } catch (error) {
        if (error instanceof AgentApiError) {
          if (error.kind === "AUTH") throw new FatalAgentError("The server rejected this agent's token (revoked or replaced). Pair the agent again.");
          if (error.kind === "CONFLICT" || error.kind === "NOT_FOUND" || error.kind === "REJECTED") {
            this.deps.logger.warn("job.ack_rejected", { jobId: job.jobId, kind: error.kind, code: error.code });
            return;
          }
        }
        if (attempt === ACK_ATTEMPTS) {
          this.deps.logger.error("job.ack_failed", { jobId: job.jobId, result: result.result });
          return;
        }
        await this.sleep(1_000 * 2 ** (attempt - 1));
      }
    }
  }
}

function healthFromError(error: unknown): Health {
  if (error instanceof PrintTransportError) {
    const health: PrinterHealthValue = error.code === "PRINTER_OFFLINE" || error.code === "TIMEOUT" ? "OFFLINE" : "ERROR";
    return { health, detail: error.message.slice(0, 120) };
  }
  return { health: "ERROR", detail: "Unexpected printer error" };
}
