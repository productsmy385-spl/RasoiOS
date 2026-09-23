import type { MetadataRoute } from "next";
import { listPublicSiteSlugs } from "@/lib/data/public-restaurant";
import { canonicalPublicUrl } from "@/lib/tenancy/request";

/**
 * LD-PUB-03 sitemap (S1-P09-T005). Lists the public website of every ACTIVE tenant whose site is published, and
 * nothing else: a suspended tenant and an unpublished website are simply absent, exactly as they are absent from the
 * page itself (ADR-012 §7). No console, platform or account route is ever listed.
 *
 * Each restaurant is listed at its canonical sub-domain when `PUBLIC_ROOT_DOMAIN` is configured, and at the path form
 * otherwise, so the sitemap always matches the `<link rel="canonical">` the page emits (ADR-012 §2).
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const sites = await listPublicSiteSlugs();

  return sites.flatMap((site) => {
    const home = canonicalPublicUrl(site.slug) ?? (base === "" ? null : `${base}/r/${site.slug}`);
    if (home === null) return [];
    const root = home.replace(/\/$/, "");
    return [
      { url: root, lastModified: site.updatedAt, changeFrequency: "weekly" as const, priority: 1 },
      { url: `${root}/daily`, lastModified: site.updatedAt, changeFrequency: "daily" as const, priority: 0.8 },
    ];
  });
}
