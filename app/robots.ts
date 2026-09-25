import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/**
 * LD-PUB-03 robots (S1-P09-T005). Restaurant websites are meant to be found; the console, the platform admin, the
 * account pages and every API are not. This is discoverability hygiene, not a security control — access to those
 * paths is refused by the middleware and re-checked by every loader and action (SC-AUTH-04).
 */
export const PRIVATE_PATHS = ["/restaurant", "/admin", "/account", "/api"] as const;

export default function robots(): MetadataRoute.Robots {
  const base = (appUrl() ?? "").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] }],
    ...(base === "" ? {} : { sitemap: `${base}/sitemap.xml`, host: base }),
  };
}
