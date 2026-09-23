/**
 * Seed content for the two development tenants (S1-P02-T007).
 *
 * Tenant A and Tenant B deliberately share names ("Starters", "Mains", "Beverages", customer "Sam Taylor") so a
 * cross-tenant leak is visible by content as well as by id. They also differ where isolation bugs hide:
 * time zone (Asia/Kolkata vs America/New_York), currency (INR vs USD), GSTIN (A only), website (A published, B not).
 *
 * Staff emails use Clerk's test sub-address `+clerk_test`: in a Clerk *development* instance these addresses accept
 * the fixed code 424242, so local sign-in and E2E tests need no real inbox.
 */
import type { DietaryType, TenantRole } from "@prisma/client";

export type ItemDef = {
  key: string;
  name: string;
  description: string;
  price: string;
  taxRate: string;
  dietary: DietaryType | null;
  section: string;
  variants?: Array<{ name: string; price: string; isDefault?: boolean }>;
  addons?: Array<{ name: string; price: string }>;
};

/**
 * Public-website appearance and copy (S1-P07-T010, ADR-013 §6). Development data only: the two tenants deliberately
 * use different presets, surface modes, taglines and section layouts so a leak between their public sites — or a
 * theme that is not actually applied per tenant — is visible at a glance. No image URLs: `ALLOWED_IMAGE_HOSTS` is
 * empty by default, so a seeded image would be a link the app itself would refuse.
 */
export type WebsiteSectionDef = {
  key: "HERO" | "ABOUT" | "FEATURED_MENU" | "CATEGORIES" | "POPULAR_ITEMS" | "INFO" | "HOURS" | "GALLERY" | "LOCATION" | "CONTACT" | "CTA";
  enabled: boolean;
  sortOrder: number;
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type WebsiteDef = {
  theme: {
    preset: "PLATFORM" | "CITRUS" | "OCEAN" | "BERRY" | "CUSTOM";
    surfaceMode: "DARK" | "LIGHT";
    primaryHex: string | null;
    secondaryHex: string | null;
    accentHex: string | null;
    gradientFromHex: string | null;
    gradientToHex: string | null;
  };
  tagline: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappE164: string | null;
  mapsUrl: string | null;
  sections: WebsiteSectionDef[];
};

export type TenantDef = {
  key: "a" | "b";
  tag: string;
  tenant: { name: string; slug: string };
  restaurant: {
    name: string;
    description: string;
    timezone: string;
    currencyCode: string;
    countryCode: string;
    city: string;
    region: string;
    postalCode: string;
    addressLine1: string;
    phoneE164: string;
    email: string;
    gstin: string | null;
    websitePublished: boolean;
    receiptFooter: string;
  };
  website: WebsiteDef;
  /** ISO weekday (1 = Monday) → shifts as [opens, closes] local wall-clock times; closes < opens means after midnight. */
  hours: Record<number, Array<[string, string]> | "closed">;
  sections: Array<{ code: string; name: string }>;
  categories: Array<{ key: string; name: string; description: string; items: ItemDef[] }>;
  customers: Array<{ key: string; fullName: string; phoneE164: string | null; email: string | null }>;
  printers: Array<{ key: string; name: string; purpose: "KOT" | "RECEIPT" | "KOT_AND_RECEIPT"; connection: "USB" | "LAN"; address: string; section: string | null; paperWidthMm: 58 | 80 }>;
  tables: string[];
};

export const TENANT_ROLES: TenantRole[] = ["TENANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"];

export function staffEmail(def: TenantDef, label: string): string {
  return `${def.tag}.${label}+clerk_test@example.com`;
}

export const TENANTS: TenantDef[] = [
  {
    key: "a",
    tag: "spiceroute",
    tenant: { name: "Spice Route", slug: "spice-route" },
    restaurant: {
      name: "Spice Route",
      description: "North and South Indian kitchen with a clay-oven tandoor.",
      timezone: "Asia/Kolkata",
      currencyCode: "INR",
      countryCode: "IN",
      city: "Bengaluru",
      region: "Karnataka",
      postalCode: "560001",
      addressLine1: "12 MG Road",
      phoneE164: "+918041234567",
      email: "hello.spiceroute+clerk_test@example.com",
      gstin: "29ABCDE1234F1Z5",
      websitePublished: true,
      receiptFooter: "Thank you for dining with us.",
    },
    // Warm custom palette on a dark site, with the gallery off and "most ordered" on.
    website: {
      theme: {
        preset: "CUSTOM",
        surfaceMode: "DARK",
        primaryHex: "#FF7A1A",
        secondaryHex: "#22D3EE",
        accentHex: "#FFD166",
        gradientFromHex: "#7C2D12",
        gradientToHex: "#431407",
      },
      tagline: "Clay-oven cooking from both coasts",
      instagramUrl: "https://www.instagram.com/spiceroute.example",
      facebookUrl: null,
      whatsappE164: "+918041234567",
      mapsUrl: "https://maps.example.com/spice-route-bengaluru",
      sections: [
        { key: "HERO", enabled: true, sortOrder: 0, headline: "Spice Route", body: "Tandoor, dosa and slow-cooked dal, seven days a week on MG Road.", ctaLabel: "See the menu", ctaHref: "/#menu" },
        { key: "FEATURED_MENU", enabled: true, sortOrder: 10, headline: "Chef's picks" },
        { key: "POPULAR_ITEMS", enabled: true, sortOrder: 20, headline: "Most ordered this week" },
        { key: "ABOUT", enabled: true, sortOrder: 30, headline: "Our kitchen", body: "Two kitchens under one roof: a clay-oven tandoor for the north, a dosa griddle for the south." },
        { key: "CATEGORIES", enabled: true, sortOrder: 40, headline: "Full menu" },
        { key: "HOURS", enabled: true, sortOrder: 50, headline: "When we're open" },
        { key: "LOCATION", enabled: true, sortOrder: 60, headline: "Find us on MG Road" },
        { key: "CONTACT", enabled: true, sortOrder: 70, headline: "Reservations" },
        { key: "INFO", enabled: false, sortOrder: 80 },
        { key: "GALLERY", enabled: false, sortOrder: 90 },
        { key: "CTA", enabled: true, sortOrder: 100, headline: "Hungry now?", ctaLabel: "Order for pickup", ctaHref: "/#menu" },
      ],
    },
    hours: {
      1: [["12:00", "15:30"], ["19:00", "23:30"]],
      2: [["12:00", "15:30"], ["19:00", "23:30"]],
      3: [["12:00", "15:30"], ["19:00", "23:30"]],
      4: [["12:00", "15:30"], ["19:00", "23:30"]],
      5: [["12:00", "15:30"], ["19:00", "01:00"]],
      6: [["12:00", "16:00"], ["19:00", "01:00"]],
      7: [["12:00", "16:00"], ["19:00", "23:00"]],
    },
    sections: [
      { code: "MAIN", name: "Main Kitchen" },
      { code: "TANDOOR", name: "Tandoor" },
      { code: "BAR", name: "Beverages" },
    ],
    categories: [
      {
        key: "starters",
        name: "Starters",
        description: "Small plates to share",
        items: [
          { key: "paneer-tikka", name: "Paneer Tikka", description: "Cottage cheese marinated in yoghurt and spices, charred in the tandoor", price: "280.00", taxRate: "5.00", dietary: "VEG", section: "TANDOOR", variants: [{ name: "Half", price: "160.00" }, { name: "Full", price: "280.00", isDefault: true }] },
          { key: "chicken-65", name: "Chicken 65", description: "Crisp fried chicken with curry leaves", price: "240.00", taxRate: "5.00", dietary: "NON_VEG", section: "MAIN" },
          { key: "masala-omelette", name: "Masala Omelette", description: "Onion, chilli and coriander omelette", price: "120.00", taxRate: "5.00", dietary: "EGG", section: "MAIN" },
        ],
      },
      {
        key: "mains",
        name: "Mains",
        description: "Curries and dals",
        items: [
          { key: "butter-chicken", name: "Butter Chicken", description: "Tandoori chicken in a tomato and butter gravy", price: "360.00", taxRate: "5.00", dietary: "NON_VEG", section: "MAIN", addons: [{ name: "Extra Butter", price: "30.00" }, { name: "Butter Naan", price: "60.00" }] },
          { key: "dal-makhani", name: "Dal Makhani", description: "Black lentils slow-cooked overnight", price: "260.00", taxRate: "5.00", dietary: "VEG", section: "MAIN", addons: [{ name: "Jeera Rice", price: "90.00" }] },
        ],
      },
      {
        key: "beverages",
        name: "Beverages",
        description: "Hot and cold drinks",
        items: [
          { key: "masala-chai", name: "Masala Chai", description: "Spiced milk tea", price: "40.00", taxRate: "5.00", dietary: "VEG", section: "BAR" },
          { key: "lime-soda", name: "Fresh Lime Soda", description: "Sweet or salted", price: "80.00", taxRate: "18.00", dietary: "VEG", section: "BAR", variants: [{ name: "Sweet", price: "80.00", isDefault: true }, { name: "Salted", price: "80.00" }] },
        ],
      },
    ],
    customers: [
      { key: "sam", fullName: "Sam Taylor", phoneE164: "+919900000001", email: "sam.taylor.a+clerk_test@example.com" },
      { key: "priya", fullName: "Priya Nair", phoneE164: "+919900000002", email: null },
      { key: "walkin", fullName: "Rahul Verma", phoneE164: null, email: null },
    ],
    printers: [
      { key: "kitchen", name: "Kitchen Printer", purpose: "KOT", connection: "LAN", address: "192.168.1.50:9100", section: "MAIN", paperWidthMm: 80 },
      { key: "tandoor", name: "Tandoor Printer", purpose: "KOT", connection: "USB", address: "USB001", section: "TANDOOR", paperWidthMm: 58 },
      { key: "counter", name: "Counter Receipt", purpose: "RECEIPT", connection: "USB", address: "USB002", section: null, paperWidthMm: 80 },
    ],
    tables: ["T1", "T2", "T4", "T7", "Patio 2"],
  },
  {
    key: "b",
    tag: "harbourgrill",
    tenant: { name: "Harbour Grill", slug: "harbour-grill" },
    restaurant: {
      name: "Harbour Grill",
      description: "Seafood and grill by the water.",
      timezone: "America/New_York",
      currencyCode: "USD",
      countryCode: "US",
      city: "New York",
      region: "NY",
      postalCode: "10004",
      addressLine1: "1 Battery Pl",
      phoneE164: "+12125550123",
      email: "hello.harbourgrill+clerk_test@example.com",
      gstin: null,
      websitePublished: false,
      receiptFooter: "See you again soon.",
    },
    // A light, cool preset with a different section order: nothing about Tenant B's site looks like Tenant A's.
    website: {
      theme: {
        preset: "OCEAN",
        surfaceMode: "LIGHT",
        primaryHex: null,
        secondaryHex: null,
        accentHex: null,
        gradientFromHex: null,
        gradientToHex: null,
      },
      tagline: "Seafood and fire by the water",
      instagramUrl: null,
      facebookUrl: "https://www.facebook.com/harbourgrill.example",
      whatsappE164: null,
      mapsUrl: "https://maps.example.com/harbour-grill-nyc",
      sections: [
        { key: "HERO", enabled: true, sortOrder: 0, headline: "Harbour Grill", body: "Day-boat fish over open flame, one block from Battery Park." },
        { key: "ABOUT", enabled: true, sortOrder: 10, headline: "The room", body: "Twenty-four seats, an open grill and a view of the water." },
        { key: "INFO", enabled: true, sortOrder: 20, headline: "Before you come", body: "Walk-ins only before 6pm. The bar is first come, first served." },
        { key: "CATEGORIES", enabled: true, sortOrder: 30, headline: "Menu" },
        { key: "HOURS", enabled: true, sortOrder: 40, headline: "Hours" },
        { key: "CONTACT", enabled: true, sortOrder: 50, headline: "Get in touch" },
        { key: "LOCATION", enabled: true, sortOrder: 60, headline: "1 Battery Pl" },
        { key: "FEATURED_MENU", enabled: false, sortOrder: 70 },
        { key: "POPULAR_ITEMS", enabled: false, sortOrder: 80 },
        { key: "GALLERY", enabled: false, sortOrder: 90 },
        { key: "CTA", enabled: false, sortOrder: 100 },
      ],
    },
    hours: {
      1: "closed",
      2: [["11:00", "22:00"]],
      3: [["11:00", "22:00"]],
      4: [["11:00", "22:00"]],
      5: [["11:00", "23:30"]],
      6: [["10:00", "00:30"]],
      7: [["10:00", "21:00"]],
    },
    sections: [
      { code: "GRILL", name: "Grill" },
      { code: "COLD", name: "Cold Station" },
    ],
    categories: [
      {
        key: "starters",
        name: "Starters",
        description: "To begin",
        items: [
          { key: "clam-chowder", name: "Clam Chowder", description: "New England style", price: "9.50", taxRate: "8.50", dietary: "NON_VEG", section: "GRILL", variants: [{ name: "Cup", price: "6.50" }, { name: "Bowl", price: "9.50", isDefault: true }] },
          { key: "calamari", name: "Crispy Calamari", description: "With lemon aioli", price: "12.00", taxRate: "8.50", dietary: "NON_VEG", section: "GRILL" },
          { key: "house-salad", name: "House Salad", description: "Greens, radish, citrus dressing", price: "8.00", taxRate: "8.50", dietary: "VEG", section: "COLD" },
        ],
      },
      {
        key: "mains",
        name: "Mains",
        description: "From the grill",
        items: [
          { key: "grilled-salmon", name: "Grilled Salmon", description: "Charred lemon, herb butter", price: "24.00", taxRate: "8.50", dietary: "NON_VEG", section: "GRILL", addons: [{ name: "Side Salad", price: "4.50" }] },
          { key: "harbour-burger", name: "Harbour Burger", description: "Double patty, pickles, house sauce", price: "16.00", taxRate: "8.50", dietary: "NON_VEG", section: "GRILL", addons: [{ name: "Bacon", price: "2.00" }, { name: "Cheese", price: "1.50" }] },
        ],
      },
      {
        key: "beverages",
        name: "Beverages",
        description: "Soft drinks and coffee",
        items: [
          { key: "lemonade", name: "Lemonade", description: "Fresh squeezed", price: "4.00", taxRate: "8.50", dietary: "VEG", section: "COLD" },
          { key: "coffee", name: "Coffee", description: "Drip coffee, free refills", price: "3.00", taxRate: "8.50", dietary: "VEG", section: "COLD" },
        ],
      },
    ],
    customers: [
      { key: "sam", fullName: "Sam Taylor", phoneE164: "+12125550001", email: "sam.taylor.b+clerk_test@example.com" },
      { key: "jordan", fullName: "Jordan Lee", phoneE164: "+12125550002", email: null },
      { key: "walkin", fullName: "Alex Kim", phoneE164: null, email: null },
    ],
    printers: [
      { key: "kitchen", name: "Line Printer", purpose: "KOT", connection: "LAN", address: "10.0.0.20:9100", section: "GRILL", paperWidthMm: 80 },
      { key: "counter", name: "Front Desk", purpose: "KOT_AND_RECEIPT", connection: "USB", address: "USB001", section: null, paperWidthMm: 80 },
    ],
    tables: ["1", "2", "5", "Bar 3", "12"],
  },
];
