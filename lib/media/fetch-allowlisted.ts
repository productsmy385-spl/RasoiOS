import "server-only";
import { allowedImageHosts, checkImageUrl } from "@/lib/validation/url";
import { logger } from "@/lib/logger";

/**
 * Fetching a remote image the server itself will render (S1-P09-T006, SC-VAL-04).
 *
 * A stored image URL was allowlisted when it was saved, but the allowlist can change and a stored row outlives the
 * setting that accepted it — so the host is checked again here, immediately before the request goes out. Nothing else
 * in the application makes an outbound request to an address that came from a tenant's own data, which is why the
 * limits live in one place rather than at each call site:
 *
 * - **host allowlist**, re-checked per call, so this can never be turned into a request to an arbitrary address by
 *   editing a website setting (SSRF; threat-model T-011);
 * - **3 s timeout**, so a slow or hanging host cannot hold a serverless invocation open;
 * - **2 MB cap**, enforced while streaming rather than after, so a hostile `Content-Length` cannot be used to make
 *   the server buffer an arbitrarily large body;
 * - **image content types only**, so an HTML error page is not handed to the image renderer.
 *
 * Every failure returns `null`. A social preview is worth having, never worth an error page or a hung request.
 */
export const IMAGE_FETCH_TIMEOUT_MS = 3_000;
export const IMAGE_FETCH_MAX_BYTES = 2 * 1024 * 1024;

export type FetchedImage = { data: ArrayBuffer; contentType: string };

/** Reads at most `limit` bytes, aborting as soon as the body goes over — the declared length is never trusted. */
async function readCapped(response: Response, limit: number): Promise<ArrayBuffer | null> {
  const body = response.body;
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out.buffer;
}

/**
 * The image at `rawUrl`, or `null` when it is not allowlisted, not an image, too big, too slow or unreachable.
 * `hosts` is injectable so tests can state the allowlist instead of depending on the environment.
 */
export async function fetchAllowlistedImage(rawUrl: string | null | undefined, hosts: readonly string[] = allowedImageHosts()): Promise<FetchedImage | null> {
  if (!rawUrl) return null;
  const checked = checkImageUrl(rawUrl, hosts);
  if (!checked.ok) return null;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(checked.url, {
      signal: abort.signal,
      // A redirect could leave the allowlist, and the destination would never be checked.
      redirect: "error",
      headers: { accept: "image/*" },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) return null;

    const declared = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > IMAGE_FETCH_MAX_BYTES) return null;

    const data = await readCapped(response, IMAGE_FETCH_MAX_BYTES);
    return data === null ? null : { data, contentType };
  } catch (error) {
    // An unreachable or hostile host is ordinary here; it is logged without the URL, which is tenant data.
    logger.debug("media.image_fetch_failed", { host: new URL(checked.url).hostname, reason: error instanceof Error ? error.name : "unknown" });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
