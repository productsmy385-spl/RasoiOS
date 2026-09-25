import { LogIn, Store } from "lucide-react";
import Link from "next/link";
import { JsonLd, restaurantJsonLd } from "@/lib/seo/json-ld";
import { OpenNowBadge } from "./hours";
import { SiteImage } from "./primitives";
import { SiteSections } from "./sections";
import { siteThemeStyle, surfaceThemeAttribute } from "./theme";
import { siteNavLinks, socialLinks, type SiteView } from "./site-view";

/**
 * The public website shell (S1-P09-T003/T012; ADR-013 §6).
 *
 * The root element carries the tenant's theme — its `--site-*` variables, the semantic tokens re-pointed to the same
 * checked colours, and `data-theme` for the surface mode it chose — so a restaurant that picked a light website gets
 * a light website instead of inheriting the dark console theme. Nothing on this page carries platform branding: the
 * header shows the restaurant's own mark, and the footer its own details.
 */

function SiteHeader({ view }: { view: SiteView }) {
  const { site } = view;
  const links = siteNavLinks(site.sections);
  return (
    <header className="border-b border-border-subtle">
      <div className="mx-auto flex w-full max-w-public flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <a href={view.homeHref} className="flex items-center gap-3">
          <SiteImage src={site.identity.logoUrl} alt="" fallbackIcon={Store} className="h-10 w-10 rounded-xl" />
          <span className="font-display text-heading">{site.restaurant.name}</span>
        </a>
        <div className="flex min-w-0 items-center gap-4 overflow-x-auto">
          {links.length > 0 ? (
            <nav aria-label={`${site.restaurant.name} sections`}>
              <ul className="flex list-none items-center gap-1 p-0">
                {links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="inline-flex h-10 items-center whitespace-nowrap rounded-xl px-3 text-nav text-fg-secondary hover:text-fg-primary">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <OpenNowBadge openNow={site.openNow} />
          {/* The restaurant's own staff sign in here. `/sign-in` is apex-only: on a tenant sub-domain the middleware
              sends it to the apex host (one Clerk domain, ADR-012 §6), and after sign-in the console shows only the
              restaurants that person is a member of. */}
          <Link
            href="/sign-in"
            prefetch={false}
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-border-strong px-3 text-nav text-fg-primary hover:bg-raised"
          >
            <LogIn aria-hidden="true" className="h-4 w-4" />
            Staff login
          </Link>
        </div>
      </div>
    </header>
  );
}

/** A published link shown by its host name; an unparsable value (never written by the validator) shows verbatim. */
function linkLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function SiteFooter({ view }: { view: SiteView }) {
  const { site } = view;
  const links = socialLinks(site.identity);
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex w-full max-w-public flex-col gap-3 px-4 py-8 md:px-6">
        <p className="font-display text-heading">{site.restaurant.name}</p>
        {site.identity.tagline ? <p className="text-body text-fg-secondary">{site.identity.tagline}</p> : null}
        {site.restaurant.address ? <p className="break-words text-body text-fg-secondary">{site.restaurant.address}</p> : null}
        {links.length > 0 ? (
          <ul className="flex list-none flex-wrap gap-4 p-0">
            {links.map((href) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-label text-fg-accent hover:underline">
                  {linkLabel(href)}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-caption text-fg-secondary">
          {site.restaurant.name} · {site.timezone}
        </p>
      </div>
    </footer>
  );
}

/** schema.org data for this restaurant, built only from what it has published (LD-PUB-03). */
function SiteJsonLd({ view }: { view: SiteView }) {
  const { site } = view;
  return (
    <JsonLd
      data={restaurantJsonLd({
        name: site.restaurant.name,
        description: site.seoDescription ?? site.identity.tagline ?? site.restaurant.description,
        url: view.canonicalUrl,
        image: site.identity.heroImageUrl ?? site.restaurant.coverImageUrl ?? site.restaurant.logoUrl,
        telephone: site.restaurant.phone,
        email: site.restaurant.email,
        address: site.restaurant.address,
        currencyCode: site.currencyCode,
        sameAs: socialLinks(site.identity),
        hours: site.hours.filter((day) => !day.isClosed).map((day) => ({ dayOfWeek: day.dayOfWeek, shifts: day.shifts })),
        menu: site.categories.map((category) => ({
          name: category.name,
          description: category.description,
          items: category.items.map((item) => ({ name: item.name, description: item.description, price: item.price })),
        })),
      })}
    />
  );
}

/** The whole public page: theme root, header, the restaurant's sections in its own order, footer. */
export function PublicSitePage({ view }: { view: SiteView }) {
  const { site } = view;
  return (
    <div
      data-theme={surfaceThemeAttribute(site.theme)}
      data-site-slug={site.slug}
      style={siteThemeStyle(site.theme, site.cssVariables)}
      className="min-h-screen bg-canvas text-fg-primary"
    >
      <SiteJsonLd view={view} />
      <SiteHeader view={view} />
      <main>
        <SiteSections view={view} />
      </main>
      <SiteFooter view={view} />
    </div>
  );
}

/** A small page (today's menu) on the same theme, without the full section list. */
export function PublicSiteFrame({ view, children }: { view: SiteView; children: React.ReactNode }) {
  const { site } = view;
  return (
    <div
      data-theme={surfaceThemeAttribute(site.theme)}
      data-site-slug={site.slug}
      style={siteThemeStyle(site.theme, site.cssVariables)}
      className="min-h-screen bg-canvas text-fg-primary"
    >
      <SiteHeader view={view} />
      <main>{children}</main>
      <SiteFooter view={view} />
    </div>
  );
}
