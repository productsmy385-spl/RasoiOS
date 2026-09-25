import "server-only";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * ImageKit Upload/Media API wrapper (RASOIOS-ADR-017, S1-P07-T009).
 *
 * - Server-side only: authenticates with IMAGEKIT_PRIVATE_KEY (HTTP Basic, key as the user name). The key never
 *   reaches the browser — uploads are proxied through the app (ADR-017 §2).
 * - The caller decides folder and file name; nothing here takes a path from a request.
 * - Every call either succeeds or throws `ImageKitError` with a stable code; logs carry no key and no file bytes.
 */

export type ImageKitErrorCode = "UPLOADS_DISABLED" | "UPLOAD_FAILED" | "DELETE_FAILED" | "IMAGEKIT_TIMEOUT";

export class ImageKitError extends AppError {
  constructor(code: ImageKitErrorCode, message: string) {
    super(message, code === "UPLOADS_DISABLED" ? 503 : code === "IMAGEKIT_TIMEOUT" ? 503 : 502, code);
  }
}

export type ImageKitOptions = {
  privateKey?: string;
  urlEndpoint?: string;
  /** Overridable for the HTTP stub in tests; production uses ImageKit's documented hosts. */
  uploadApiUrl?: string;
  mediaApiUrl?: string;
  timeoutMs?: number;
};

export type UploadedFile = { fileId: string; url: string; filePath: string; width: number | null; height: number | null; size: number };

const UPLOAD_API = "https://upload.imagekit.io/api/v1/files/upload";
const MEDIA_API = "https://api.imagekit.io/v1/files";

/** The configured URL endpoint (`https://ik.imagekit.io/<id>`), without a trailing slash, or null when uploads are off. */
export function imageKitUrlEndpoint(source: string | undefined = process.env.IMAGEKIT_URL_ENDPOINT): string | null {
  const value = source?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

/** Uploads are enabled only when both server settings are present (lib/env.ts enforces "both or neither"). */
export function uploadsEnabled(): boolean {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY?.trim()) && imageKitUrlEndpoint() !== null;
}

export function createImageKit(options: ImageKitOptions = {}) {
  const privateKey = options.privateKey ?? process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  const urlEndpoint = options.urlEndpoint ?? imageKitUrlEndpoint();
  const uploadApiUrl = options.uploadApiUrl ?? UPLOAD_API;
  const mediaApiUrl = options.mediaApiUrl ?? MEDIA_API;
  const timeoutMs = options.timeoutMs ?? 20_000;

  function authorization(): string {
    if (!privateKey || !urlEndpoint) throw new ImageKitError("UPLOADS_DISABLED", "Image uploads are not set up yet. Paste an image link instead.");
    return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
  }

  async function send(code: ImageKitErrorCode, message: string, context: Record<string, unknown>, url: string, init: RequestInit): Promise<Response> {
    const headers = { authorization: authorization(), ...(init.headers as Record<string, string> | undefined) };
    let response: Response;
    try {
      response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const timedOut = (error as { name?: string } | null)?.name === "TimeoutError";
      logger.error(timedOut ? "imagekit.timeout" : "imagekit.request_failed", { ...context, operation: code });
      throw timedOut ? new ImageKitError("IMAGEKIT_TIMEOUT", "The image service did not respond in time. Try again.") : new ImageKitError(code, message);
    }
    return response;
  }

  return {
    urlEndpoint,

    /** Uploads one already-validated, re-encoded image as a public file at `folder/fileName`. Never overwrites. */
    async upload(input: { bytes: Buffer; fileName: string; folder: string; contentType: string }): Promise<UploadedFile> {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.contentType }), input.fileName);
      form.append("fileName", input.fileName);
      form.append("folder", input.folder);
      form.append("useUniqueFileName", "false");
      form.append("overwriteFile", "false");
      form.append("isPrivateFile", "false");
      const context = { folder: input.folder, bytes: input.bytes.length };
      const response = await send("UPLOAD_FAILED", "The image could not be uploaded. Try again.", context, uploadApiUrl, { method: "POST", body: form });
      if (!response.ok) {
        logger.error("imagekit.request_failed", { ...context, operation: "UPLOAD_FAILED", status: response.status });
        throw new ImageKitError("UPLOAD_FAILED", "The image could not be uploaded. Try again.");
      }
      const body = (await response.json()) as Partial<{ fileId: string; url: string; filePath: string; width: number; height: number; size: number }>;
      if (typeof body.fileId !== "string" || typeof body.url !== "string" || typeof body.filePath !== "string") {
        logger.error("imagekit.unexpected_response", { ...context, operation: "UPLOAD_FAILED" });
        throw new ImageKitError("UPLOAD_FAILED", "The image could not be uploaded. Try again.");
      }
      logger.info("imagekit.uploaded", { fileId: body.fileId, filePath: body.filePath });
      return { fileId: body.fileId, url: body.url, filePath: body.filePath, width: body.width ?? null, height: body.height ?? null, size: body.size ?? input.bytes.length };
    },

    /** Deletes a file by its ImageKit id. Already-deleted files (404) count as done. */
    async remove(fileId: string): Promise<void> {
      const response = await send("DELETE_FAILED", "The image could not be deleted. Try again.", { fileId }, `${mediaApiUrl}/${encodeURIComponent(fileId)}`, { method: "DELETE" });
      if (response.ok || response.status === 404) {
        logger.info("imagekit.deleted", { fileId, status: response.status });
        return;
      }
      logger.error("imagekit.request_failed", { fileId, operation: "DELETE_FAILED", status: response.status });
      throw new ImageKitError("DELETE_FAILED", "The image could not be deleted. Try again.");
    },
  };
}

export type ImageKit = ReturnType<typeof createImageKit>;

let shared: ImageKit | undefined;

/** The application's ImageKit client (configured from IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT). */
export function imageKit(): ImageKit {
  shared ??= createImageKit();
  return shared;
}
