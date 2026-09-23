/**
 * JSON-LD serialization for the public restaurant website (S1-P09-T005; api.md LD-PUB-03; SC-VAL-03).
 *
 * Structured data is the one place tenant text is written into a `<script>` body, so it is the one place an unescaped
 * `</script>` in a restaurant name would end the script early and let the rest be parsed as markup. Two defences:
 *
 * 1. `jsonLdString` escapes `<`, `>`, `&`, U+2028 and U+2029 as `\uXXXX` sequences. Those are valid JSON *string*
 *    escapes, so consumers read the original characters, while the serialized text can no longer contain `</script`,
 *    `<!--` or a raw line separator.
 * 2. The value is passed to React as a text child of `<script>`. `dangerouslySetInnerHTML` is banned repository-wide
 *    (eslint `no-restricted-syntax`), and React additionally neutralises `</script` in inline script children.
 *
 * Nothing here fabricates data: a field with no value is omitted rather than filled in.
 */

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/** `JSON.stringify` with every character that can break out of a `<script>` body escaped. */
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => ESCAPES[character]);
}

/** A `<script type="application/ld+json">` element carrying `data`. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json">{jsonLdString(data)}</script>;
}

type JsonObject = Record<string, unknown>;

/** Drops null, undefined and empty-array members so a sparse restaurant never publishes empty structured data. */
function compact(value: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)));
}

export type JsonLdRestaurant = {
  name: string;
  description: string | null;
  url: string | null;
  image: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
  currencyCode: string;
  sameAs: string[];
  /** ISO weekday (1 = Monday) → shifts, already filtered to open days. */
  hours: Array<{ dayOfWeek: number; shifts: Array<{ opensAt: string; closesAt: string }> }>;
  menu: Array<{ name: string; description: string | null; items: Array<{ name: string; description: string | null; price: string }> }>;
};

const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** schema.org `Restaurant` with an embedded `Menu` (LD-PUB-03). Only fields the restaurant actually published. */
export function restaurantJsonLd(restaurant: JsonLdRestaurant): JsonObject {
  const openingHours = restaurant.hours.flatMap((day) =>
    day.shifts.map((shift) =>
      compact({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[day.dayOfWeek - 1] ?? null,
        opens: shift.opensAt,
        closes: shift.closesAt,
      }),
    ),
  );

  const sections = restaurant.menu.map((section) =>
    compact({
      "@type": "MenuSection",
      name: section.name,
      description: section.description,
      hasMenuItem: section.items.map((item) =>
        compact({
          "@type": "MenuItem",
          name: item.name,
          description: item.description,
          offers: { "@type": "Offer", price: item.price, priceCurrency: restaurant.currencyCode },
        }),
      ),
    }),
  );

  return compact({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description,
    url: restaurant.url,
    image: restaurant.image,
    telephone: restaurant.telephone,
    email: restaurant.email,
    address: restaurant.address === null ? null : { "@type": "PostalAddress", streetAddress: restaurant.address },
    currenciesAccepted: restaurant.currencyCode,
    sameAs: restaurant.sameAs,
    openingHoursSpecification: openingHours,
    hasMenu: sections.length === 0 ? null : compact({ "@type": "Menu", hasMenuSection: sections }),
  });
}
