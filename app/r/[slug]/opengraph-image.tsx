import { ImageResponse } from "next/og";
import { fetchAllowlistedImage } from "@/lib/media/fetch-allowlisted";
import { loadPublicSiteForMetadata } from "./load-site";

/**
 * The social preview card for a restaurant's website (S1-P09-T006, RH-PUB-01).
 *
 * Built from the same public projection the page itself renders, so it can only ever contain what a diner already
 * sees: the restaurant's name, its tagline and its own colours. A logo is drawn only when its host is still on the
 * allowlist at the moment of the request (`fetchAllowlistedImage`), and the card falls back to the restaurant's
 * initial when it is not — a preview is never worth an outbound request to an address a tenant chose freely.
 *
 * An unknown slug, a suspended tenant and an unpublished website all produce the same 404 as the page (ADR-012 §7):
 * the loader returns null and this route renders nothing.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Restaurant website preview";

/** Public, identical for everyone, and cheap to regenerate — an hour at the edge (api.md §7). */
export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export default async function OpengraphImage({ params }: Params) {
  const { slug } = await params;
  const site = await loadPublicSiteForMetadata(slug);
  // Next answers 404 for a metadata route that throws, which is the same answer the page gives.
  if (site === null) throw new Error("Not found");

  const { restaurant, theme, identity } = site;
  const logo = await fetchAllowlistedImage(identity.logoUrl ?? restaurant.logoUrl);
  const logoSrc = logo === null ? null : `data:${logo.contentType};base64,${Buffer.from(logo.data).toString("base64")}`;
  const tagline = identity.tagline ?? restaurant.description;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: theme.surface,
          backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          color: theme.onGradient,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders to PNG; next/image cannot run here.
            <img src={logoSrc} alt="" width={112} height={112} style={{ width: 112, height: 112, borderRadius: 24, objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primary,
                color: theme.onPrimary,
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              {restaurant.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: restaurant.name.length > 28 ? 68 : 88, fontWeight: 700, lineHeight: 1.05 }}>{restaurant.name}</div>
          {tagline && <div style={{ fontSize: 34, opacity: 0.9, lineHeight: 1.3 }}>{tagline.slice(0, 120)}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 26, opacity: 0.85 }}>
          <div style={{ display: "flex" }}>{restaurant.address ?? ""}</div>
          <div style={{ display: "flex" }}>{site.openNow ? "Open now" : ""}</div>
        </div>
      </div>
    ),
    size,
  );
}
