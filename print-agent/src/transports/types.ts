/**
 * A way of getting bytes to one physical printer (S1-P17-T006). `send` resolves only once the bytes were handed to the
 * printer connection; `probe` checks reachability without printing anything.
 */
export type TransportErrorCode = "PRINTER_OFFLINE" | "TIMEOUT" | "INVALID_ADDRESS" | "WRITE_FAILED" | "UNSUPPORTED_PLATFORM";

export class PrintTransportError extends Error {
  constructor(
    readonly code: TransportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PrintTransportError";
  }
}

export interface Transport {
  send(bytes: Buffer): Promise<void>;
  probe(): Promise<void>;
}

export type TransportTimeouts = { connectMs: number; writeMs: number };
export const DEFAULT_TIMEOUTS: TransportTimeouts = { connectMs: 5_000, writeMs: 10_000 };
