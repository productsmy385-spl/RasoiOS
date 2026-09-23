/**
 * Builds and inserts the development dataset (S1-P02-T007).
 *
 * Idempotent: every row has a deterministic id (seedId) and is inserted with `createMany({ skipDuplicates: true })`,
 * i.e. INSERT … ON CONFLICT DO NOTHING. Re-running inserts nothing new and never issues an UPDATE (so the append-only
 * audit trigger is never hit). Money follows ADR-010: Decimal only, ROUND_HALF_UP per line, totals derived from lines,
 * order paid/refunded amounts derived from the ledger (INV-04).
 */
import { randomBytes } from "node:crypto";
import {
  Prisma,
  type KotStatus,
  type OrderPriority,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
  type PrismaClient,
  type TenantRole,
} from "@prisma/client";
import { businessDateFor, compactIsoDate, toIsoDate } from "../../lib/time/business-date";
import { seedId, sha256Hex } from "./ids";
import { TENANTS, TENANT_ROLES, staffEmail, type ItemDef, type TenantDef } from "./tenants";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const round2 = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const ZERO = D(0);

export type SeedOptions = { now: Date; superAdminEmail?: string; appUrl: string };
export type SeedSummary = Record<string, number>;

type OrderLineSpec = { item: string; qty: number; variant?: number; addons?: number[]; note?: string };
type PaymentSpec = { key: string; method: PaymentMethod; amount: "total" | "half"; tendered?: boolean; voided?: boolean };
type OrderSpec = {
  key: string;
  daysAgo: 0 | 1;
  minutesAgo: number;
  status: OrderStatus;
  type: OrderType;
  table?: number;
  /** Index into the tenant customer list (tenants have different customers). */
  customer?: number;
  priority?: OrderPriority;
  lines: OrderLineSpec[];
  payments?: PaymentSpec[];
  refund?: { key: string; of: string; share: "all" | "tenth"; reason: string };
  cancelReason?: string;
};

/** Same order shapes for both tenants; items are referenced as `<category>/<index>`. Covers every order status. */
const ORDERS: OrderSpec[] = [
  { key: "o1", daysAgo: 0, minutesAgo: 3, status: "NEW", type: "DINE_IN", table: 0, lines: [{ item: "starters/0", qty: 2 }, { item: "beverages/0", qty: 2 }] },
  { key: "o2", daysAgo: 0, minutesAgo: 9, status: "ACCEPTED", type: "TAKEAWAY", customer: 0, lines: [{ item: "mains/0", qty: 1, addons: [0] }] },
  {
    key: "o3", daysAgo: 0, minutesAgo: 18, status: "PREPARING", type: "DINE_IN", table: 1, priority: "HIGH",
    lines: [{ item: "starters/1", qty: 1 }, { item: "mains/1", qty: 2, addons: [0], note: "Less spicy" }],
    payments: [{ key: "p1", method: "CASH", amount: "total", tendered: true, voided: true }],
  },
  {
    key: "o4", daysAgo: 0, minutesAgo: 27, status: "READY", type: "DINE_IN", table: 2,
    lines: [{ item: "starters/2", qty: 1 }, { item: "beverages/1", qty: 2, variant: 1 }],
    payments: [{ key: "p1", method: "UPI", amount: "half" }],
  },
  {
    key: "o5", daysAgo: 0, minutesAgo: 55, status: "COMPLETED", type: "TAKEAWAY", customer: 1,
    lines: [{ item: "mains/0", qty: 2 }, { item: "beverages/0", qty: 2 }],
    payments: [{ key: "p1", method: "CASH", amount: "total", tendered: true }],
  },
  { key: "o6", daysAgo: 0, minutesAgo: 40, status: "CANCELLED", type: "DINE_IN", table: 3, lines: [{ item: "starters/0", qty: 1 }], cancelReason: "Guest left before the food was served" },
  {
    key: "o7", daysAgo: 0, minutesAgo: 70, status: "REFUNDED", type: "DELIVERY", customer: 2,
    lines: [{ item: "mains/1", qty: 1 }],
    payments: [{ key: "p1", method: "CARD", amount: "total" }],
    refund: { key: "r1", of: "p1", share: "all", reason: "Order arrived cold" },
  },
  {
    key: "y1", daysAgo: 1, minutesAgo: 60, status: "COMPLETED", type: "DINE_IN", table: 4,
    lines: [{ item: "mains/0", qty: 1 }, { item: "starters/1", qty: 1 }],
    payments: [{ key: "p1", method: "CASH", amount: "total", tendered: true }],
  },
  { key: "y2", daysAgo: 1, minutesAgo: 90, status: "COMPLETED", type: "TAKEAWAY", customer: 0, lines: [{ item: "mains/1", qty: 1, addons: [0] }], payments: [{ key: "p1", method: "UPI", amount: "total" }] },
  {
    key: "y3", daysAgo: 1, minutesAgo: 120, status: "COMPLETED", type: "DINE_IN", table: 0,
    lines: [{ item: "starters/0", qty: 1 }, { item: "beverages/1", qty: 1 }],
    payments: [{ key: "p1", method: "CARD", amount: "total" }],
    refund: { key: "r1", of: "p1", share: "tenth", reason: "Drink was wrong" },
  },
];

const STATUS_PATH: OrderStatus[] = ["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED"];
const KOT_STATUS: Partial<Record<OrderStatus, KotStatus>> = {
  ACCEPTED: "QUEUED",
  PREPARING: "PREPARING",
  READY: "READY",
  COMPLETED: "SERVED",
  REFUNDED: "SERVED",
  CANCELLED: "CANCELLED",
};

function paymentStatusOf(total: Prisma.Decimal, paid: Prisma.Decimal, refunded: Prisma.Decimal): PaymentStatus {
  if (refunded.gt(0)) return refunded.gte(paid) ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (paid.eq(0)) return "UNPAID";
  return paid.gte(total) ? "PAID" : "PARTIALLY_PAID";
}

function timeOfDay(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

function buildTenant(def: TenantDef, opts: SeedOptions, superAdminId: string | null) {
  const id = (label: string) => seedId(`${def.key}:${label}`);
  const tz = def.restaurant.timezone;
  const minutesAgo = (days: number, minutes: number) => new Date(opts.now.getTime() - days * 86_400_000 - minutes * 60_000);
  const today = businessDateFor(opts.now, tz);
  const dayOffset = (days: number) => new Date(today.getTime() + days * 86_400_000);

  const tenantId = id("tenant");
  const restaurantId = id("restaurant");
  const tenant = { id: tenantId, name: def.tenant.name, slug: def.tenant.slug, createdByUserId: superAdminId, createdAt: minutesAgo(30, 0) };
  const restaurant = {
    id: restaurantId,
    tenantId,
    name: def.restaurant.name,
    description: def.restaurant.description,
    phoneE164: def.restaurant.phoneE164,
    email: def.restaurant.email,
    addressLine1: def.restaurant.addressLine1,
    city: def.restaurant.city,
    region: def.restaurant.region,
    postalCode: def.restaurant.postalCode,
    countryCode: def.restaurant.countryCode,
    timezone: tz,
    currencyCode: def.restaurant.currencyCode,
    websitePublished: def.restaurant.websitePublished,
    receiptFooter: def.restaurant.receiptFooter,
    gstin: def.restaurant.gstin,
    seoTitle: `${def.restaurant.name} — Menu`,
    // Public website appearance (ADR-013 §6). `brandAccentHex` is the theme accent.
    themePreset: def.website.theme.preset,
    themeSurfaceMode: def.website.theme.surfaceMode,
    themePrimaryHex: def.website.theme.primaryHex,
    themeSecondaryHex: def.website.theme.secondaryHex,
    brandAccentHex: def.website.theme.accentHex,
    gradientFromHex: def.website.theme.gradientFromHex,
    gradientToHex: def.website.theme.gradientToHex,
    tagline: def.website.tagline,
    instagramUrl: def.website.instagramUrl,
    facebookUrl: def.website.facebookUrl,
    whatsappE164: def.website.whatsappE164,
    mapsUrl: def.website.mapsUrl,
  };

  const websiteSections = def.website.sections.map((section) => ({
    id: id(`website-section:${section.key}`),
    tenantId,
    restaurantId,
    key: section.key,
    enabled: section.enabled,
    sortOrder: section.sortOrder,
    headline: section.headline ?? null,
    body: section.body ?? null,
    imageUrl: null,
    ctaLabel: section.ctaLabel ?? null,
    ctaHref: section.ctaHref ?? null,
  }));

  type HoursRow = { id: string; tenantId: string; restaurantId: string; dayOfWeek: number; sequence: number; isClosed: boolean; opensAt: Date | null; closesAt: Date | null };
  const hours = Object.entries(def.hours).flatMap(([day, shifts]): HoursRow[] =>
    shifts === "closed"
      ? [{ id: id(`hours:${day}:1`), tenantId, restaurantId, dayOfWeek: Number(day), sequence: 1, isClosed: true, opensAt: null, closesAt: null }]
      : shifts.map(([opens, closes], i) => ({
          id: id(`hours:${day}:${i + 1}`),
          tenantId,
          restaurantId,
          dayOfWeek: Number(day),
          sequence: i + 1,
          isClosed: false,
          opensAt: timeOfDay(opens),
          closesAt: timeOfDay(closes),
        })),
  );

  const sections = def.sections.map((s, i) => ({ id: id(`section:${s.code}`), tenantId, name: s.name, code: s.code, sortOrder: i }));
  const sectionId = (code: string) => id(`section:${code}`);

  // Staff: one ACTIVE user per tenant role plus one INVITED waiter.
  const users = TENANT_ROLES.map((role) => ({
    id: id(`user:${role}`),
    email: staffEmail(def, role.toLowerCase().replace("tenant_", "")),
    fullName: `${def.tenant.name} ${role.replace("TENANT_", "").toLowerCase().replace(/^./, (c) => c.toUpperCase())}`,
  }));
  const invitedUser = { id: id("user:WAITER2"), email: staffEmail(def, "waiter2"), fullName: null as string | null, status: "ACTIVE" as const };
  const userId = (role: TenantRole) => id(`user:${role}`);
  const adminId = userId("TENANT_ADMIN");
  const memberships = [
    ...TENANT_ROLES.map((role) => ({
      id: id(`membership:${role}`),
      tenantId,
      userId: userId(role),
      role,
      status: "ACTIVE" as const,
      invitedByUserId: role === "TENANT_ADMIN" ? superAdminId : adminId,
      invitedAt: minutesAgo(29, 0),
      acceptedAt: minutesAgo(28, 0),
    })),
    { id: id("membership:WAITER2"), tenantId, userId: invitedUser.id, role: "WAITER" as TenantRole, status: "INVITED" as const, invitedByUserId: adminId, invitedAt: minutesAgo(1, 0), acceptedAt: null },
  ];

  // Menu
  const categories = def.categories.map((c, i) => ({ id: id(`category:${c.key}`), tenantId, name: c.name, description: c.description, sortOrder: i, isPublished: true }));
  const items: Array<{ def: ItemDef; row: Record<string, unknown> & { id: string; basePrice: Prisma.Decimal; taxRate: Prisma.Decimal; name: string } }> = [];
  const variants: Array<{ id: string; tenantId: string; menuItemId: string; name: string; price: Prisma.Decimal; isDefault: boolean; displayOrder: number }> = [];
  const addons: Array<{ id: string; tenantId: string; menuItemId: string; name: string; price: Prisma.Decimal; displayOrder: number }> = [];
  for (const c of def.categories) {
    c.items.forEach((item, i) => {
      const itemId = id(`item:${item.key}`);
      items.push({
        def: item,
        row: {
          id: itemId,
          tenantId,
          categoryId: id(`category:${c.key}`),
          kitchenSectionId: sectionId(item.section),
          name: item.name,
          description: item.description,
          basePrice: D(item.price),
          taxRate: D(item.taxRate),
          dietaryType: item.dietary,
          prepTimeMinutes: 10 + i * 5,
          isAvailable: !(c.key === "starters" && i === 2 && def.key === "b"), // one unavailable item for UI states
          isPublished: true,
          displayOrder: i,
        },
      });
      (item.variants ?? []).forEach((v, vi) =>
        variants.push({ id: id(`variant:${item.key}:${vi}`), tenantId, menuItemId: itemId, name: v.name, price: D(v.price), isDefault: v.isDefault ?? false, displayOrder: vi }),
      );
      (item.addons ?? []).forEach((a, ai) =>
        addons.push({ id: id(`addon:${item.key}:${ai}`), tenantId, menuItemId: itemId, name: a.name, price: D(a.price), displayOrder: ai }),
      );
    });
  }
  const itemRef = (ref: string) => {
    const [catKey, index] = ref.split("/");
    const cat = def.categories.find((c) => c.key === catKey);
    const itemDef = cat?.items[Number(index)];
    if (!itemDef) throw new Error(`Seed order references unknown item ${ref}`);
    return items.find((i) => i.def.key === itemDef.key)!;
  };

  // Daily menus: yesterday and today published, tomorrow a draft copied from today.
  const dailyMenus = [
    { id: id("daily:yesterday"), tenantId, businessDate: dayOffset(-1), status: "PUBLISHED" as const, title: "Yesterday's specials", publishedAt: minutesAgo(1, 600), publishedByUserId: userId("MANAGER"), copiedFromDailyMenuId: null, createdByUserId: userId("MANAGER") },
    { id: id("daily:today"), tenantId, businessDate: today, status: "PUBLISHED" as const, title: "Today's specials", publishedAt: minutesAgo(0, 300), publishedByUserId: userId("MANAGER"), copiedFromDailyMenuId: null, createdByUserId: userId("MANAGER") },
    { id: id("daily:tomorrow"), tenantId, businessDate: dayOffset(1), status: "DRAFT" as const, title: "Tomorrow (draft)", publishedAt: null, publishedByUserId: null, copiedFromDailyMenuId: id("daily:today"), createdByUserId: userId("MANAGER") },
  ];
  const dailyMenuItems = dailyMenus.flatMap((m) =>
    ["starters/0", "mains/0", "beverages/0"].map((ref, i) => ({ id: seedId(`${m.id}:${ref}`), tenantId, dailyMenuId: m.id, menuItemId: itemRef(ref).row.id, displayOrder: i })),
  );

  const customers = def.customers.map((c) => ({ id: id(`customer:${c.key}`), tenantId, fullName: c.fullName, phoneE164: c.phoneE164, email: c.email, createdByUserId: userId("CASHIER") }));

  // Print agents and printers
  const activeToken = `rsa_${randomBytes(24).toString("base64url")}`;
  const agents = [
    { id: id("agent:active"), tenantId, name: "Counter PC", status: "ACTIVE" as const, tokenHash: sha256Hex(activeToken), tokenPrefix: activeToken.slice(0, 8), agentVersion: "0.1.0", osInfo: "Windows 11", lastSeenAt: minutesAgo(0, 0.3), pairedAt: minutesAgo(10, 0), createdByUserId: adminId, pairingCodeHash: null, pairingExpiresAt: null, revokedAt: null, revokedByUserId: null },
    { id: id("agent:pending"), tenantId, name: "Kitchen PC", status: "PENDING_PAIRING" as const, tokenHash: null, tokenPrefix: null, agentVersion: null, osInfo: null, lastSeenAt: null, pairedAt: null, createdByUserId: adminId, pairingCodeHash: sha256Hex(randomBytes(16).toString("hex")), pairingExpiresAt: new Date(opts.now.getTime() + 10 * 60_000), revokedAt: null, revokedByUserId: null },
    { id: id("agent:revoked"), tenantId, name: "Old Laptop", status: "REVOKED" as const, tokenHash: null, tokenPrefix: "rsa_old0", agentVersion: "0.0.9", osInfo: "Windows 10", lastSeenAt: minutesAgo(20, 0), pairedAt: minutesAgo(25, 0), createdByUserId: adminId, pairingCodeHash: null, pairingExpiresAt: null, revokedAt: minutesAgo(15, 0), revokedByUserId: adminId },
  ];
  const activeAgentId = id("agent:active");
  const printers = def.printers.map((p) => ({
    id: id(`printer:${p.key}`),
    tenantId,
    printAgentId: activeAgentId,
    kitchenSectionId: p.section ? sectionId(p.section) : null,
    name: p.name,
    purpose: p.purpose,
    connectionType: p.connection,
    connectionAddress: p.address,
    paperWidthMm: p.paperWidthMm,
    health: "ONLINE" as const,
    healthReportedAt: minutesAgo(0, 1),
  }));
  const kotPrinterFor = (section: string | null) =>
    printers.find((p) => section && p.kitchenSectionId === section && p.purpose !== "RECEIPT") ??
    printers.find((p) => p.kitchenSectionId === null && p.purpose !== "RECEIPT") ??
    printers.find((p) => p.purpose !== "RECEIPT")!; // section without its own printer
  const receiptPrinter = printers.find((p) => p.purpose === "RECEIPT" || p.purpose === "KOT_AND_RECEIPT")!;

  // Orders, lines, KOTs, ledger
  const orders: Record<string, unknown>[] = [];
  const orderItems: Record<string, unknown>[] = [];
  const orderItemAddons: Record<string, unknown>[] = [];
  const kotTickets: Array<Record<string, unknown> & { id: string; businessDate: Date; kitchenSectionId: string | null; orderKey: string; status: KotStatus }> = [];
  const kotItems: Record<string, unknown>[] = [];
  const transactions: Array<Record<string, unknown> & { id: string; type: string; paymentMethod: PaymentMethod; amount: Prisma.Decimal; status: string; businessDate: Date }> = [];
  const printJobs: Record<string, unknown>[] = [];
  const audits: Record<string, unknown>[] = [];
  const orderNumberSeq = new Map<string, number>();
  const kotNumberSeq = new Map<string, number>();

  const specs = [...ORDERS].sort((a, b) => b.daysAgo - a.daysAgo || b.minutesAgo - a.minutesAgo); // creation order
  for (const spec of specs) {
    const createdAt = minutesAgo(spec.daysAgo, spec.minutesAgo);
    const businessDate = businessDateFor(createdAt, tz);
    const dateKey = toIsoDate(businessDate);
    const seq = (orderNumberSeq.get(dateKey) ?? 0) + 1;
    orderNumberSeq.set(dateKey, seq);
    const orderId = id(`order:${spec.key}`);

    let subtotal = ZERO;
    let tax = ZERO;
    const lines = spec.lines.map((line, li) => {
      const item = itemRef(line.item);
      const itemVariants = variants.filter((v) => v.menuItemId === item.row.id);
      const variant = itemVariants.length ? (line.variant !== undefined ? itemVariants[line.variant] : itemVariants.find((v) => v.isDefault) ?? itemVariants[0]) : undefined;
      const chosenAddons = (line.addons ?? []).map((ai) => addons.filter((a) => a.menuItemId === item.row.id)[ai]);
      const unit = variant ? variant.price : item.row.basePrice;
      const addonsTotal = chosenAddons.reduce((s, a) => s.add(a.price), ZERO);
      const lineSubtotal = round2(unit.add(addonsTotal).mul(line.qty));
      const lineTax = round2(lineSubtotal.mul(item.row.taxRate).div(100));
      subtotal = subtotal.add(lineSubtotal);
      tax = tax.add(lineTax);
      const orderItemId = id(`order:${spec.key}:line:${li}`);
      const section = item.row.kitchenSectionId as string;
      orderItems.push({
        id: orderItemId,
        tenantId,
        orderId,
        menuItemId: item.row.id,
        variantId: variant?.id ?? null,
        kitchenSectionId: section,
        itemNameSnapshot: item.row.name,
        variantNameSnapshot: variant?.name ?? null,
        unitPriceSnapshot: unit,
        addonsTotalSnapshot: addonsTotal,
        taxRateSnapshot: item.row.taxRate,
        quantity: line.qty,
        lineSubtotal,
        lineTax,
        lineTotal: lineSubtotal.add(lineTax),
        specialInstructions: line.note ?? null,
        createdAt,
      });
      chosenAddons.forEach((a) =>
        orderItemAddons.push({ id: seedId(`${orderItemId}:addon:${a.id}`), tenantId, orderItemId, addonId: a.id, nameSnapshot: a.name, priceSnapshot: a.price, createdAt }),
      );
      return { orderItemId, section, label: variant ? `${item.row.name} (${variant.name})` : item.row.name, qty: line.qty, addons: chosenAddons.map((a) => a.name), note: line.note };
    });
    const total = subtotal.add(tax);

    // Ledger for this order
    const byKey = new Map<string, string>();
    for (const p of spec.payments ?? []) {
      const amount = p.amount === "total" ? total : round2(total.div(2));
      const tendered = p.tendered ? amount.div(100).ceil().mul(100).lte(amount) ? amount.add(100) : amount.div(100).ceil().mul(100) : null;
      const txId = id(`order:${spec.key}:tx:${p.key}`);
      byKey.set(p.key, txId);
      transactions.push({
        id: txId,
        tenantId,
        orderId,
        type: "PAYMENT",
        paymentMethod: p.method,
        status: p.voided ? "VOIDED" : "SUCCESS",
        amount,
        amountTendered: p.method === "CASH" ? tendered : null,
        changeDue: p.method === "CASH" && tendered ? tendered.sub(amount) : null,
        reference: p.method === "CASH" ? null : `REF-${spec.key.toUpperCase()}-${def.key.toUpperCase()}`,
        businessDate,
        idempotencyKey: seedId(`${txId}:idem`),
        recordedByUserId: userId("CASHIER"),
        voidedAt: p.voided ? new Date(createdAt.getTime() + 4 * 60_000) : null,
        voidedByUserId: p.voided ? userId("MANAGER") : null,
        voidReason: p.voided ? "Recorded twice by mistake" : null,
        createdAt: new Date(createdAt.getTime() + 3 * 60_000),
      });
    }
    if (spec.refund) {
      const original = transactions.find((t) => t.id === byKey.get(spec.refund!.of))!;
      const amount = spec.refund.share === "all" ? original.amount : round2(original.amount.div(10));
      const txId = id(`order:${spec.key}:tx:${spec.refund.key}`);
      transactions.push({
        id: txId,
        tenantId,
        orderId,
        type: "REFUND",
        paymentMethod: original.paymentMethod,
        status: "SUCCESS",
        amount,
        amountTendered: null,
        changeDue: null,
        reference: null,
        refundOfTransactionId: original.id,
        reason: spec.refund.reason,
        businessDate,
        idempotencyKey: seedId(`${txId}:idem`),
        recordedByUserId: userId("MANAGER"),
        createdAt: new Date(createdAt.getTime() + 30 * 60_000),
      });
    }
    const orderTx = transactions.filter((t) => t.orderId === orderId && t.status === "SUCCESS");
    const paid = orderTx.filter((t) => t.type === "PAYMENT").reduce((s, t) => s.add(t.amount), ZERO);
    const refunded = orderTx.filter((t) => t.type === "REFUND").reduce((s, t) => s.add(t.amount), ZERO);

    const reached = spec.status === "CANCELLED" ? 1 : spec.status === "REFUNDED" ? 4 : STATUS_PATH.indexOf(spec.status);
    const at = (step: number) => (reached >= step ? new Date(createdAt.getTime() + step * 4 * 60_000) : null);
    orders.push({
      id: orderId,
      tenantId,
      orderNumber: `${compactIsoDate(businessDate)}-${String(seq).padStart(4, "0")}`,
      businessDate,
      orderType: spec.type,
      status: spec.status,
      priority: spec.priority ?? "NORMAL",
      paymentStatus: paymentStatusOf(total, paid, refunded),
      tableLabel: spec.table !== undefined ? def.tables[spec.table] : null,
      customerId: spec.customer !== undefined ? id(`customer:${def.customers[spec.customer].key}`) : null,
      subtotalAmount: subtotal,
      taxAmount: tax,
      discountAmount: ZERO,
      totalAmount: total,
      paidAmount: paid,
      refundedAmount: refunded,
      currencyCode: def.restaurant.currencyCode,
      idempotencyKey: seedId(`${orderId}:idem`),
      createdByUserId: spec.type === "DINE_IN" ? userId("WAITER") : userId("CASHIER"),
      acceptedAt: at(1),
      preparingAt: at(2),
      readyAt: at(3),
      completedAt: at(4),
      refundedAt: spec.status === "REFUNDED" ? new Date(createdAt.getTime() + 30 * 60_000) : null,
      cancelledAt: spec.status === "CANCELLED" ? new Date(createdAt.getTime() + 10 * 60_000) : null,
      cancelledByUserId: spec.status === "CANCELLED" ? userId("MANAGER") : null,
      cancelReason: spec.cancelReason ?? null,
      version: spec.status === "CANCELLED" ? 2 : spec.status === "REFUNDED" ? 5 : reached,
      createdAt,
    });
    audits.push({ id: id(`audit:order:${spec.key}`), tenantId, actorType: "USER", actorUserId: userId("CASHIER"), actorRole: "CASHIER", action: "order.created", resourceType: "order", resourceId: orderId, afterState: { status: "NEW", total: total.toFixed(2) }, createdAt });

    // KOTs: one per kitchen section once the order has been accepted.
    const kotStatus = KOT_STATUS[spec.status];
    if (kotStatus) {
      for (const section of [...new Set(lines.map((l) => l.section))]) {
        const k = (kotNumberSeq.get(dateKey) ?? 0) + 1;
        kotNumberSeq.set(dateKey, k);
        const kotId = id(`order:${spec.key}:kot:${section}`);
        const queuedAt = new Date(createdAt.getTime() + 4 * 60_000);
        kotTickets.push({
          id: kotId,
          orderKey: spec.key,
          tenantId,
          orderId,
          kitchenSectionId: section,
          businessDate,
          kotNumber: `K-${String(k).padStart(3, "0")}`,
          roundNumber: 1,
          status: kotStatus,
          priority: spec.priority ?? "NORMAL",
          orderTypeSnapshot: spec.type,
          tableLabelSnapshot: spec.table !== undefined ? def.tables[spec.table] : null,
          queuedAt,
          preparingAt: ["PREPARING", "READY", "SERVED"].includes(kotStatus) ? new Date(queuedAt.getTime() + 60_000) : null,
          readyAt: ["READY", "SERVED"].includes(kotStatus) ? new Date(queuedAt.getTime() + 8 * 60_000) : null,
          servedAt: kotStatus === "SERVED" ? new Date(queuedAt.getTime() + 10 * 60_000) : null,
          cancelledAt: kotStatus === "CANCELLED" ? new Date(createdAt.getTime() + 10 * 60_000) : null,
          createdAt: queuedAt,
        });
        for (const line of lines.filter((l) => l.section === section)) {
          kotItems.push({
            id: seedId(`${kotId}:${line.orderItemId}`),
            tenantId,
            kotTicketId: kotId,
            orderItemId: line.orderItemId,
            quantity: line.qty,
            itemLabelSnapshot: line.label,
            addonsSnapshot: line.addons.length ? line.addons.join(", ") : null,
            instructionsSnapshot: line.note ?? null,
          });
        }
      }
    }
  }

  // Print jobs in every status (KOT jobs for today's accepted orders, a receipt and a test print).
  const jobStatusFor: Record<string, "PENDING" | "PROCESSING" | "PRINTED" | "FAILED"> = { o2: "PENDING", o3: "PROCESSING", o4: "FAILED", o5: "PRINTED", o6: "PRINTED", o7: "PRINTED" };
  for (const kot of kotTickets.filter((k) => jobStatusFor[k.orderKey])) {
    const status = jobStatusFor[kot.orderKey];
    const printer = kotPrinterFor(kot.kitchenSectionId);
    const createdAt = kot.createdAt as Date;
    printJobs.push({
      id: seedId(`${kot.id}:job`),
      tenantId,
      printerId: printer.id,
      printAgentId: status === "PENDING" ? null : activeAgentId,
      jobType: "KOT",
      orderId: kot.orderId,
      kotTicketId: kot.id,
      dedupeKey: `KOT:${kot.id}:v1`,
      payload: { version: 1, kind: "KOT", kotNumber: kot.kotNumber, table: kot.tableLabelSnapshot },
      status,
      attemptCount: status === "PENDING" ? 0 : status === "FAILED" ? 3 : 1,
      nextAttemptAt: createdAt,
      claimToken: status === "PROCESSING" ? seedId(`${kot.id}:claim`) : null,
      claimedAt: status === "PENDING" ? null : new Date(createdAt.getTime() + 5_000),
      leaseExpiresAt: status === "PROCESSING" ? new Date(opts.now.getTime() + 60_000) : null,
      printedAt: status === "PRINTED" ? new Date(createdAt.getTime() + 8_000) : null,
      failedAt: status === "FAILED" ? new Date(createdAt.getTime() + 90_000) : null,
      lastErrorCode: status === "FAILED" ? "PRINTER_OFFLINE" : null,
      lastErrorMessage: status === "FAILED" ? "The printer did not respond" : null,
      requestedByUserId: userId("CASHIER"),
      createdAt,
    });
  }
  const o5 = orders.find((o) => o.id === id("order:o5"))!;
  printJobs.push({
    id: id("job:receipt:o5"),
    tenantId,
    printerId: receiptPrinter.id,
    printAgentId: activeAgentId,
    jobType: "RECEIPT",
    orderId: o5.id,
    kotTicketId: null,
    dedupeKey: `RECEIPT:${o5.id as string}:v1`,
    payload: { version: 1, kind: "RECEIPT", orderNumber: o5.orderNumber },
    status: "PRINTED",
    attemptCount: 1,
    claimedAt: minutesAgo(0, 20),
    printedAt: minutesAgo(0, 20),
    requestedByUserId: userId("CASHIER"),
  });
  printJobs.push({
    id: id("job:test"),
    tenantId,
    printerId: receiptPrinter.id,
    printAgentId: activeAgentId,
    jobType: "TEST",
    dedupeKey: `TEST:${id("job:test")}`,
    payload: { version: 1, kind: "TEST" },
    status: "PRINTED",
    attemptCount: 1,
    claimedAt: minutesAgo(1, 0),
    printedAt: minutesAgo(1, 0),
    requestedByUserId: adminId,
  });

  // Day close for yesterday, derived from yesterday's ledger.
  const yesterday = dayOffset(-1);
  const yTx = transactions.filter((t) => t.status === "SUCCESS" && t.businessDate.getTime() === yesterday.getTime());
  const net = (method: PaymentMethod) =>
    yTx.filter((t) => t.paymentMethod === method).reduce((s, t) => (t.type === "PAYMENT" ? s.add(t.amount) : s.sub(t.amount)), ZERO);
  const expectedCash = net("CASH");
  const shortBy = D(def.restaurant.currencyCode === "INR" ? "10.00" : "1.00");
  const countedCash = expectedCash.gte(shortBy) ? expectedCash.sub(shortBy) : expectedCash;
  const yOrders = orders.filter((o) => (o.businessDate as Date).getTime() === yesterday.getTime());
  const dayCloses = [
    {
      id: id("dayclose:yesterday"),
      tenantId,
      businessDate: yesterday,
      expectedCash,
      countedCash,
      cashVariance: countedCash.sub(expectedCash),
      cardTotal: net("CARD"),
      upiTotal: net("UPI"),
      refundTotal: yTx.filter((t) => t.type === "REFUND").reduce((s, t) => s.add(t.amount), ZERO),
      orderCount: yOrders.length,
      openOrderCount: yOrders.filter((o) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status as string)).length,
      notes: countedCash.eq(expectedCash) ? null : "Short at close; float counted twice",
      closedByUserId: userId("MANAGER"),
      createdAt: minutesAgo(0, 600),
    },
  ];

  // Counters reflect the numbers issued above (ADR-010 §6).
  const counters = [
    ...[...orderNumberSeq].map(([date, last]) => ({ tenantId, counterType: "ORDER" as const, businessDate: new Date(`${date}T00:00:00.000Z`), lastValue: last })),
    ...[...kotNumberSeq].map(([date, last]) => ({ tenantId, counterType: "KOT" as const, businessDate: new Date(`${date}T00:00:00.000Z`), lastValue: last })),
  ];

  const shareUrl = `${opts.appUrl.replace(/\/$/, "")}/r/${def.tenant.slug}`;
  const socialPosts = [
    { id: id("social:draft"), tenantId, channel: "WHATSAPP" as const, cardType: "DAILY_MENU" as const, dailyMenuId: id("daily:today"), menuItemId: null, caption: `Today's specials at ${def.restaurant.name}`, shareUrl, status: "DRAFT" as const, createdByUserId: userId("MANAGER") },
    { id: id("social:ready"), tenantId, channel: "INSTAGRAM" as const, cardType: "MENU_ITEM" as const, dailyMenuId: null, menuItemId: itemRef("starters/0").row.id, caption: `Try our ${itemRef("starters/0").row.name}`, shareUrl, status: "READY" as const, createdByUserId: userId("MANAGER") },
    { id: id("social:posted"), tenantId, channel: "FACEBOOK" as const, cardType: "MENU_ITEM" as const, dailyMenuId: null, menuItemId: itemRef("mains/0").row.id, caption: `${itemRef("mains/0").row.name} is back`, shareUrl, status: "MARKED_POSTED" as const, postedUrl: "https://facebook.com/example/posts/1", markedPostedAt: minutesAgo(2, 0), markedPostedByUserId: userId("MANAGER"), createdByUserId: userId("MANAGER") },
  ];

  audits.push(
    { id: id("audit:tenant.created"), tenantId, actorType: superAdminId ? "USER" : "SYSTEM", actorUserId: superAdminId, actorRole: superAdminId ? "SUPER_ADMIN" : null, action: "tenant.created", resourceType: "tenant", resourceId: tenantId, afterState: { name: def.tenant.name, slug: def.tenant.slug }, createdAt: minutesAgo(30, 0) },
    { id: id("audit:staff.invited"), tenantId, actorType: "USER", actorUserId: adminId, actorRole: "TENANT_ADMIN", action: "staff.invited", resourceType: "user_tenant", resourceId: id("membership:WAITER2"), afterState: { role: "WAITER", status: "INVITED" }, createdAt: minutesAgo(1, 0) },
    { id: id("audit:print_agent.paired"), tenantId, actorType: "PRINT_AGENT", actorAgentId: activeAgentId, action: "print_agent.paired", resourceType: "print_agent", resourceId: activeAgentId, createdAt: minutesAgo(10, 0) },
    { id: id("audit:day_close"), tenantId, actorType: "USER", actorUserId: userId("MANAGER"), actorRole: "MANAGER", action: "day_close.performed", resourceType: "business_day_close", resourceId: id("dayclose:yesterday"), afterState: { businessDate: toIsoDate(yesterday), cashVariance: dayCloses[0].cashVariance.toFixed(2) }, createdAt: minutesAgo(0, 600) },
    ...transactions.map((t) => ({
      id: seedId(`${t.id}:audit`),
      tenantId,
      actorType: "USER",
      actorUserId: t.recordedByUserId,
      action: t.type === "PAYMENT" ? "payment.recorded" : "refund.created",
      resourceType: "transaction",
      resourceId: t.id,
      afterState: { amount: t.amount.toFixed(2), method: t.paymentMethod },
      createdAt: t.createdAt,
    })),
    ...transactions.filter((t) => t.status === "VOIDED").map((t) => ({
      id: seedId(`${t.id}:void-audit`),
      tenantId,
      actorType: "USER",
      actorUserId: t.voidedByUserId,
      action: "transaction.voided",
      resourceType: "transaction",
      resourceId: t.id,
      reason: t.voidReason,
      createdAt: t.voidedAt,
    })),
  );

  return {
    tenant,
    restaurant,
    websiteSections,
    hours,
    sections,
    users: [...users.map((u) => ({ ...u, status: "ACTIVE" as const })), invitedUser],
    memberships,
    categories,
    items: items.map((i) => i.row),
    variants,
    addons,
    dailyMenus,
    dailyMenuItems,
    customers,
    orders,
    orderItems,
    orderItemAddons,
    kotTickets: kotTickets.map((k) => Object.fromEntries(Object.entries(k).filter(([key]) => key !== "orderKey"))),
    kotItems,
    transactions,
    dayCloses,
    agents,
    printers,
    printJobs,
    socialPosts,
    counters,
    audits,
  };
}

/** Inserts the whole dataset. Safe to run repeatedly (see file header). */
export async function seedDatabase(db: PrismaClient, opts: SeedOptions): Promise<SeedSummary> {
  let superAdminId: string | null = null;
  if (opts.superAdminEmail) {
    const email = opts.superAdminEmail.trim().toLowerCase();
    const admin = await db.user.upsert({
      where: { email },
      create: { id: seedId(`platform:superadmin:${email}`), email, fullName: "Platform Owner", platformRole: "SUPER_ADMIN" },
      update: { platformRole: "SUPER_ADMIN" },
    });
    superAdminId = admin.id;
  }

  const built = TENANTS.map((def) => buildTenant(def, opts, superAdminId));
  const all = <K extends keyof (typeof built)[number]>(key: K) => built.flatMap((b) => b[key] as unknown as Record<string, unknown>[]);
  const summary: SeedSummary = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each delegate's createMany has its own input type
  const insert = async (name: string, delegate: { createMany: (args: any) => Promise<{ count: number }> }, rows: Record<string, unknown>[]) => {
    const { count } = await delegate.createMany({ data: rows, skipDuplicates: true });
    summary[name] = count;
  };

  await db.$transaction(
    async (tx) => {
      await insert("users", tx.user, all("users"));
      await insert("tenants", tx.tenant, built.map((b) => b.tenant));
      await insert("restaurants", tx.restaurant, built.map((b) => b.restaurant));
      await insert("websiteSections", tx.websiteSection, all("websiteSections"));
      await insert("restaurantHours", tx.restaurantHours, all("hours"));
      await insert("kitchenSections", tx.kitchenSection, all("sections"));
      await insert("memberships", tx.userTenant, all("memberships"));
      await insert("menuCategories", tx.menuCategory, all("categories"));
      await insert("menuItems", tx.menuItem, all("items"));
      await insert("menuItemVariants", tx.menuItemVariant, all("variants"));
      await insert("menuItemAddons", tx.menuItemAddon, all("addons"));
      // Copies reference their source, so insert sources first.
      await insert("dailyMenus", tx.dailyMenu, all("dailyMenus").filter((m) => m.copiedFromDailyMenuId === null));
      summary.dailyMenus += (await tx.dailyMenu.createMany({ data: all("dailyMenus").filter((m) => m.copiedFromDailyMenuId !== null) as never, skipDuplicates: true })).count;
      await insert("dailyMenuItems", tx.dailyMenuItem, all("dailyMenuItems"));
      await insert("customers", tx.customer, all("customers"));
      await insert("orders", tx.order, all("orders"));
      await insert("orderItems", tx.orderItem, all("orderItems"));
      await insert("orderItemAddons", tx.orderItemAddon, all("orderItemAddons"));
      await insert("kotTickets", tx.kotTicket, all("kotTickets"));
      await insert("kotItems", tx.kotItem, all("kotItems"));
      // Refunds reference their payment, so payments go first.
      await insert("transactions", tx.transaction, all("transactions").filter((t) => t.type === "PAYMENT"));
      summary.transactions += (await tx.transaction.createMany({ data: all("transactions").filter((t) => t.type === "REFUND") as never, skipDuplicates: true })).count;
      await insert("businessDayCloses", tx.businessDayClose, all("dayCloses"));
      await insert("printAgents", tx.printAgent, all("agents"));
      await insert("printers", tx.printer, all("printers"));
      await insert("printJobs", tx.printJob, all("printJobs"));
      await insert("socialPosts", tx.socialPost, all("socialPosts"));
      await insert("tenantCounters", tx.tenantCounter, all("counters"));
      await insert("auditLogs", tx.auditLog, all("audits"));
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return summary;
}
