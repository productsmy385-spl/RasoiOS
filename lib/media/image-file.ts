import "server-only";
import { createHash } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { ValidationError } from "@/lib/errors";

/**
 * Upload validation and re-encoding (SC-FILE-01, RASOIOS-ADR-017 §3). Runs on the server before anything is sent to
 * ImageKit, so a file that fails here is never stored anywhere.
 *
 * - The type comes from the file's own bytes (magic numbers), never from the browser's MIME type or file name.
 * - JPEG, PNG and WebP only. SVG, GIF, HEIC and anything else are rejected (SVG can carry script).
 * - At most MAX_UPLOAD_BYTES in, at most MAX_INPUT_PIXELS decoded (decompression-bomb guard).
 * - Re-encoded in the same format: EXIF/GPS and every other metadata block are dropped, orientation is applied first,
 *   and the longest side is capped at MAX_DIMENSION. Polyglots do not survive a decode/encode round trip.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_DIMENSION = 4096;
export const MIN_DIMENSION = 16;
const MAX_INPUT_PIXELS = 50_000_000;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export const EXTENSION_FOR: Record<ImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** The image type named by the leading bytes, or null for anything that is not JPEG, PNG or WebP. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

export type ProcessedImage = { bytes: Buffer; contentType: ImageType; extension: string; width: number; height: number; sha256: string };

const invalid = (message: string, code = "INVALID_IMAGE") => new ValidationError(message, { file: [message] }, code);

export async function processUpload(input: Uint8Array): Promise<ProcessedImage> {
  if (input.length === 0) throw invalid("Choose an image file.");
  if (input.length > MAX_UPLOAD_BYTES) throw invalid("The image is larger than 5 MB. Choose a smaller file.", "IMAGE_TOO_LARGE");
  const contentType = sniffImageType(input);
  if (!contentType) throw invalid("Only JPG, PNG and WebP images can be uploaded.", "UNSUPPORTED_IMAGE_TYPE");

  let output: { data: Buffer; info: OutputInfo };
  try {
    const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", animated: false })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });
    const encoded =
      contentType === "image/jpeg"
        ? pipeline.jpeg({ quality: 86, mozjpeg: true })
        : contentType === "image/png"
          ? pipeline.png({ compressionLevel: 9 })
          : pipeline.webp({ quality: 86 });
    // sharp writes no metadata unless asked to (no withMetadata/keepExif), which strips EXIF, GPS, XMP and ICC text.
    output = await encoded.toBuffer({ resolveWithObject: true });
  } catch {
    throw invalid("This file isn't a readable image. Choose a different JPG, PNG or WebP file.");
  }

  const { width, height } = output.info;
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) throw invalid(`The image must be at least ${MIN_DIMENSION} × ${MIN_DIMENSION} pixels.`, "IMAGE_TOO_SMALL");

  return {
    bytes: output.data,
    contentType,
    extension: EXTENSION_FOR[contentType],
    width,
    height,
    sha256: createHash("sha256").update(output.data).digest("hex"),
  };
}
