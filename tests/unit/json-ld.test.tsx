import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd, jsonLdString, restaurantJsonLd } from "@/lib/seo/json-ld";

// TC-SEC-002 — structured data is the one place tenant text is written into a <script> body (S1-P09-T005, SC-VAL-03).
const HOSTILE = '</script><script>alert(1)</script>';

describe("TC-SEC-002 JSON-LD serializer", () => {
  it("a restaurant name containing a closing script tag produces no closing script tag", () => {
    const serialized = jsonLdString({ name: HOSTILE });
    expect(serialized).not.toContain("</script");
    expect(serialized).not.toContain("<script");
    expect(serialized).toContain("\\u003c");
    // The escapes are ordinary JSON, so a consumer still reads the original characters.
    expect(JSON.parse(serialized)).toEqual({ name: HOSTILE });
  });

  it("escapes every character that can break out of an inline script", () => {
    const serialized = jsonLdString({ a: "<", b: ">", c: "&", d: " ", e: " ", f: "<!--" });
    for (const raw of ["<", ">", "&", " ", " "]) expect(serialized).not.toContain(raw);
    expect(JSON.parse(serialized)).toEqual({ a: "<", b: ">", c: "&", d: " ", e: " ", f: "<!--" });
  });

  it("renders as a script element whose markup carries no executable tag", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: HOSTILE }} />);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe("restaurantJsonLd builds only from published values", () => {
  const base = {
    name: "Spice Route",
    description: null,
    url: null,
    image: null,
    telephone: null,
    email: null,
    address: null,
    currencyCode: "INR",
    sameAs: [],
    hours: [],
    menu: [],
  };

  it("omits everything the restaurant has not supplied", () => {
    expect(restaurantJsonLd(base)).toEqual({ "@context": "https://schema.org", "@type": "Restaurant", name: "Spice Route", currenciesAccepted: "INR" });
  });

  it("maps hours to OpeningHoursSpecification and the menu to MenuSection/MenuItem", () => {
    const data = restaurantJsonLd({
      ...base,
      telephone: "+918041234567",
      address: "12 MG Road, Bengaluru",
      sameAs: ["https://www.instagram.com/spiceroute.example"],
      hours: [{ dayOfWeek: 2, shifts: [{ opensAt: "12:00", closesAt: "15:30" }] }],
      menu: [{ name: "Starters", description: null, items: [{ name: "Paneer Tikka", description: null, price: "280.00" }] }],
    }) as Record<string, any>;

    expect(data.openingHoursSpecification).toEqual([{ "@type": "OpeningHoursSpecification", dayOfWeek: "Tuesday", opens: "12:00", closes: "15:30" }]);
    expect(data.hasMenu.hasMenuSection[0].hasMenuItem[0]).toEqual({
      "@type": "MenuItem",
      name: "Paneer Tikka",
      offers: { "@type": "Offer", price: "280.00", priceCurrency: "INR" },
    });
    expect(data.address).toEqual({ "@type": "PostalAddress", streetAddress: "12 MG Road, Bengaluru" });
  });
});
