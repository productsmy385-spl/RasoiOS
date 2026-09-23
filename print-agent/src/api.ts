import { z } from "zod";

/**
 * Client of the machine API RH-AGT-01…05 (ADR-007, api.md §Print Agent).
 *
 * - Every response is validated: the agent treats the server's answer as untrusted input, like any other network data.
 * - `redirect: "error"`: a redirect could carry the bearer header to another origin, so none is followed.
 * - Every call has a timeout; a hung connection must not stall the claim loop.
 * - No request body carries a tenant — the server derives it from the token (ADR-007 §1).
 */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type ApiErrorKind = "AUTH" | "INVALID_PAIRING_CODE" | "RATE_LIMITED" | "CONFLICT" | "NOT_FOUND" | "REJECTED" | "SERVER" | "NETWORK" | "PROTOCOL";

export class AgentApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

const printerHealth = z.enum(["UNKNOWN", "ONLINE", "OFFLINE", "ERROR"]);
export type PrinterHealthValue = z.infer<typeof printerHealth>;

export const agentPrinterSchema = z.object({
  printerId: z.string().uuid(),
  name: z.string().max(120),
  purpose: z.enum(["KOT", "RECEIPT", "KOT_AND_RECEIPT"]),
  connectionType: z.enum(["LAN", "USB"]),
  connectionAddress: z.string().max(255),
  paperWidthMm: z.number().int(),
});
export type AgentPrinter = z.infer<typeof agentPrinterSchema>;

const intervals = { pollIntervalMs: z.number().int().positive(), heartbeatIntervalMs: z.number().int().positive() };
const pairResponseSchema = z.object({ agentId: z.string().uuid(), token: z.string().min(20).max(200), printers: z.array(agentPrinterSchema), ...intervals });
const configResponseSchema = z.object({ agentId: z.string().uuid(), printers: z.array(agentPrinterSchema).max(50), ...intervals });
const heartbeatResponseSchema = z.object({ serverTime: z.string(), ...intervals });
export const claimedJobSchema = z.object({
  jobId: z.string().uuid(),
  claimToken: z.string().uuid(),
  printerId: z.string().uuid(),
  jobType: z.enum(["KOT", "RECEIPT", "TEST"]),
  payload: z.unknown(),
  leaseExpiresAt: z.string(),
  attemptCount: z.number().int(),
});
export type ClaimedJob = z.infer<typeof claimedJobSchema>;
const claimResponseSchema = z.object({ jobs: z.array(claimedJobSchema).max(10) });
const ackResponseSchema = z.object({ jobId: z.string().uuid(), status: z.string() });

export type PairResponse = z.infer<typeof pairResponseSchema>;
export type ConfigResponse = z.infer<typeof configResponseSchema>;
export type HeartbeatBody = { agentVersion?: string; printers: Array<{ printerId: string; health: PrinterHealthValue; detail?: string }> };
export type AckBody = { claimToken: string; result: "PRINTED" | "FAILED"; errorCode?: string; errorMessage?: string };

export interface AgentApiLike {
  config(): Promise<ConfigResponse>;
  heartbeat(body: HeartbeatBody): Promise<z.infer<typeof heartbeatResponseSchema>>;
  claim(max: number): Promise<{ jobs: ClaimedJob[] }>;
  ack(jobId: string, body: AckBody): Promise<{ jobId: string; status: string }>;
}

export class AgentApi implements AgentApiLike {
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(
    private readonly origin: string,
    private readonly token: string | null,
    options: { fetch?: FetchLike; timeoutMs?: number; userAgent?: string } = {},
  ) {
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.userAgent = options.userAgent ?? "rasoios-print-agent";
  }

  static async pair(origin: string, body: { pairingCode: string; agentVersion: string; osInfo: string }, options: { fetch?: FetchLike; timeoutMs?: number } = {}): Promise<PairResponse> {
    const api = new AgentApi(origin, null, options);
    return api.request("POST", "/api/v1/print-agent/pair", body, pairResponseSchema);
  }

  config() {
    return this.request("GET", "/api/v1/print-agent/config", undefined, configResponseSchema);
  }

  heartbeat(body: HeartbeatBody) {
    return this.request("POST", "/api/v1/print-agent/heartbeat", body, heartbeatResponseSchema);
  }

  claim(max: number) {
    return this.request("POST", "/api/v1/print-agent/jobs/claim", { max }, claimResponseSchema);
  }

  ack(jobId: string, body: AckBody) {
    if (!z.string().uuid().safeParse(jobId).success) throw new AgentApiError("PROTOCOL", "Refusing to acknowledge a job id that is not a UUID");
    return this.request("POST", `/api/v1/print-agent/jobs/${jobId}/ack`, body, ackResponseSchema);
  }

  private async request<T extends z.ZodTypeAny>(method: "GET" | "POST", path: string, body: unknown, schema: T): Promise<z.output<T>> {
    const headers: Record<string, string> = { accept: "application/json", "user-agent": this.userAgent };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.token) headers.authorization = `Bearer ${this.token}`;

    let response: Response;
    try {
      response = await this.fetchImpl(new URL(path, this.origin).toString(), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = (error as Error)?.name === "TimeoutError" || (error as Error)?.name === "AbortError";
      throw new AgentApiError("NETWORK", timedOut ? "The server did not answer in time" : "Could not reach the server");
    }

    const text = await response.text().catch(() => "");
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) throw toApiError(response, json);

    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new AgentApiError("PROTOCOL", `Unexpected response from ${path}`, response.status);
    return parsed.data;
  }
}

function toApiError(response: Response, json: unknown): AgentApiError {
  const error = (json as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  const code = typeof error?.code === "string" ? error.code : null;
  const message = typeof error?.message === "string" ? error.message.slice(0, 200) : `HTTP ${response.status}`;
  const status = response.status;
  if (status === 401 && code === "INVALID_PAIRING_CODE") return new AgentApiError("INVALID_PAIRING_CODE", message, status, code);
  if (status === 401) return new AgentApiError("AUTH", message, status, code);
  if (status === 429) {
    const seconds = Number(response.headers.get("retry-after"));
    return new AgentApiError("RATE_LIMITED", message, status, code, Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000);
  }
  if (status === 409) return new AgentApiError("CONFLICT", message, status, code);
  if (status === 404) return new AgentApiError("NOT_FOUND", message, status, code);
  if (status >= 400 && status < 500) return new AgentApiError("REJECTED", message, status, code);
  return new AgentApiError("SERVER", message, status, code);
}
