/**
 * What an uploaded image is for, and where it lives in ImageKit (RASOIOS-ADR-017 §4). Pure — safe for client code.
 *
 * Folders are built only from the server-resolved tenant id and this fixed table; no part of a path comes from the
 * request. The tenant id (a UUID) is used rather than the slug because a slug is a public, human-chosen value while the
 * id never changes and cannot collide.
 */

export const MEDIA_PURPOSES = ["LOGO", "COVER", "HERO", "FAVICON", "WEBSITE_SECTION", "MENU_ITEM"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const PURPOSE_FOLDER: Record<MediaPurpose, string> = {
  LOGO: "logo",
  COVER: "cover",
  HERO: "hero",
  FAVICON: "favicon",
  WEBSITE_SECTION: "website",
  MENU_ITEM: "menu",
};

/** Menu images are managed by whoever manages the menu; every other image belongs to the website settings. */
export type MediaPermissionArea = "website" | "menu";
export const PURPOSE_AREA: Record<MediaPurpose, MediaPermissionArea> = {
  LOGO: "website",
  COVER: "website",
  HERO: "website",
  FAVICON: "website",
  WEBSITE_SECTION: "website",
  MENU_ITEM: "menu",
};

/** The tenant permission that manages images of each area (security.md §3.3: website:update is TENANT_ADMIN only). */
export const PERMISSION_FOR_AREA = { website: "website:update", menu: "menu:manage" } as const;

export function permissionForPurpose(purpose: MediaPurpose): (typeof PERMISSION_FOR_AREA)[MediaPermissionArea] {
  return PERMISSION_FOR_AREA[PURPOSE_AREA[purpose]];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMediaPurpose(value: unknown): value is MediaPurpose {
  return typeof value === "string" && (MEDIA_PURPOSES as readonly string[]).includes(value);
}

/** `/rasoios/restaurants/{tenantId}/{purpose}` — throws on anything but a UUID tenant id. */
export function mediaFolder(tenantId: string, purpose: MediaPurpose): string {
  if (!UUID.test(tenantId)) throw new Error("mediaFolder: tenant id must be a UUID");
  return `/rasoios/restaurants/${tenantId.toLowerCase()}/${PURPOSE_FOLDER[purpose]}`;
}

/** Keeps a display-only copy of the original file name: no path, no control characters, at most 120 characters. */
export function safeOriginalName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
  return cleaned.length > 0 ? cleaned : null;
}

/** An image served by ImageKit's own CDN host (`ik.imagekit.io`). Pure hostname check, so it also works in the browser. */
export function isImageKitUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname === "ik.imagekit.io" || hostname.endsWith(".imagekit.io"));
  } catch {
    return false;
  }
}

/**
 * An ImageKit URL with a transformation for the size it is shown at (ADR-017 §6), so a 4096 px original is never sent
 * to a 64 px thumbnail. Other URLs (the pasted, allow-listed ones) are returned unchanged. `f-auto` lets ImageKit pick
 * AVIF/WebP per browser.
 */
export function imageKitSized(url: string, width: number, quality = 80): string {
  if (!isImageKitUrl(url)) return url;
  const w = Math.max(16, Math.min(4096, Math.round(width)));
  const q = Math.max(30, Math.min(100, Math.round(quality)));
  const parsed = new URL(url);
  parsed.searchParams.set("tr", `w-${w},q-${q},f-auto`);
  return parsed.toString();
}

/** `srcset` candidates for an ImageKit URL shown `displayWidth` CSS pixels wide (1x and 2x); null for other URLs. */
export function imageKitSrcSet(url: string, displayWidth: number): string | null {
  if (!isImageKitUrl(url)) return null;
  return `${imageKitSized(url, displayWidth)} 1x, ${imageKitSized(url, displayWidth * 2)} 2x`;
}
