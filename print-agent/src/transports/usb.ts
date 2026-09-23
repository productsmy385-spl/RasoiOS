import { constants } from "node:fs";
import { access, open } from "node:fs/promises";
import { USB_ADDRESS_PATTERN } from "@/lib/print/address";
import { DEFAULT_TIMEOUTS, PrintTransportError, type Transport, type TransportTimeouts } from "./types";

/**
 * USB transport (S1-P17-T006, Q-010: Windows and Linux). Bytes are written to a device path with plain file I/O — no
 * shell, no spooler command, no child process (SC-VAL-06).
 *
 * - Windows: the printer is shared on the agent's own PC and the address is its **share name** (e.g. `KitchenPrinter`);
 *   the agent writes RAW bytes to `\\localhost\KitchenPrinter`. The share name may not contain path separators or a
 *   colon, so the address can never name a remote host or a file.
 * - Linux: the address is the usblp device, `lp0` or `usb/lp0`, mapped to `/dev/usb/lp0`. Nothing else is accepted.
 */
const WINDOWS_SHARE = /^[A-Za-z0-9][A-Za-z0-9 ._()+-]{0,63}$/;
const LINUX_LP = /^(?:usb\/)?(lp\d{1,2})$/;

export function usbDevicePath(address: string, platform: NodeJS.Platform = process.platform): string {
  if (!USB_ADDRESS_PATTERN.test(address)) throw new PrintTransportError("INVALID_ADDRESS", "The USB address has characters that are not allowed");
  if (platform === "win32") {
    if (!WINDOWS_SHARE.test(address)) {
      throw new PrintTransportError("INVALID_ADDRESS", "On Windows, use the printer's share name on this PC, e.g. KitchenPrinter");
    }
    return `\\\\localhost\\${address}`;
  }
  if (platform === "linux") {
    const match = LINUX_LP.exec(address);
    if (!match) throw new PrintTransportError("INVALID_ADDRESS", "On Linux, use the usblp device name, e.g. lp0");
    return `/dev/usb/${match[1]}`;
  }
  throw new PrintTransportError("UNSUPPORTED_PLATFORM", `USB printing is not supported on ${platform}`);
}

function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PrintTransportError("TIMEOUT", message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

function mapFsError(error: NodeJS.ErrnoException, device: string): PrintTransportError {
  if (error instanceof PrintTransportError) return error;
  if (error.code === "ENOENT" || error.code === "ENODEV" || error.code === "ENXIO" || error.code === "EBUSY") {
    return new PrintTransportError("PRINTER_OFFLINE", `Printer ${device} is not connected (${error.code})`);
  }
  if (error.code === "EACCES" || error.code === "EPERM") {
    return new PrintTransportError("WRITE_FAILED", `No permission to write to ${device}; check the service account's printer access`);
  }
  return new PrintTransportError("WRITE_FAILED", `Writing to ${device} failed (${error.code ?? "error"})`);
}

export class UsbTransport implements Transport {
  private readonly device: string;

  constructor(
    address: string,
    platform: NodeJS.Platform = process.platform,
    private readonly timeouts: TransportTimeouts = DEFAULT_TIMEOUTS,
  ) {
    this.device = usbDevicePath(address, platform);
  }

  async send(bytes: Buffer): Promise<void> {
    const write = async () => {
      const handle = await open(this.device, "w");
      try {
        await handle.write(bytes);
      } finally {
        await handle.close();
      }
    };
    try {
      await withTimeout(write(), this.timeouts.writeMs, `Printer ${this.device} did not accept data`);
    } catch (error) {
      throw mapFsError(error as NodeJS.ErrnoException, this.device);
    }
  }

  async probe(): Promise<void> {
    try {
      await withTimeout(access(this.device, constants.W_OK), this.timeouts.connectMs, `Printer ${this.device} did not respond`);
    } catch (error) {
      throw mapFsError(error as NodeJS.ErrnoException, this.device);
    }
  }
}
