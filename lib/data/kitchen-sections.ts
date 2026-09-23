import "server-only";
import { Prisma, type KotStatus } from "@prisma/client";
import type { TenantContext } from "@/lib/auth/context-types";
import { audit } from "@/lib/audit/write";
import { db } from "@/lib/db/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { CreateKitchenSectionData, UpdateKitchenSectionData } from "@/lib/validation/settings";
import { mapErrors } from "./errors";
import { required, tenantKey, tenantScope } from "./scope";
import { withTx, type Tx } from "./tx";

/**
 * Kitchen sections (S1-P07-T003, data-model.md E04, api.md SA-KSEC-01…04). Tenant-defined stations ("Tandoor",
 * "Bar") that menu items, printers and KOTs route to. Sections are archived, never deleted (§1.4); archived sections
 * leave the active set and keep their code (codes are unique per tenant for all rows, so history stays unambiguous).
 * A section of another tenant, an archived section and a missing id are all 404 (SC-TEN-04).
 */

export type KitchenSectionDto = { id: string; name: string; code: string; sortOrder: number };

const SECTION_SELECT = { id: true, name: true, code: true, sortOrder: true } satisfies Prisma.KitchenSectionSelect;
const MAX_SORT_ORDER = 9999;
/** KOTs still being worked on block archiving their section (api.md SA-KSEC-03). */
const OPEN_KOT_STATUSES: KotStatus[] = ["QUEUED", "PREPARING"];

/** 422 CODE_TAKEN (api.md SA-KSEC-01), reported on the `code` field. */
export class SectionCodeTakenError extends ValidationError {
  override readonly code: string = "CODE_TAKEN";
  constructor(code: string) {
    super(`The code ${code} is already used by another kitchen section.`, { code: [`${code} is already used by another kitchen section`] });
  }
}

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/** Active sections of the caller's tenant in board order. */
export async function listKitchenSections(ctx: TenantContext, client: Tx = db): Promise<KitchenSectionDto[]> {
  return mapErrors("Kitchen section", () =>
    client.kitchenSection.findMany({
      where: tenantScope(ctx, { archivedAt: null }),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: SECTION_SELECT,
    }),
  );
}

async function findActive(tx: Tx, ctx: TenantContext, id: string): Promise<KitchenSectionDto> {
  return required(await tx.kitchenSection.findFirst({ where: tenantScope(ctx, { id, archivedAt: null }), select: SECTION_SELECT }), "Kitchen section");
}

async function assertCodeFree(tx: Tx, ctx: TenantContext, code: string): Promise<void> {
  const holder = await tx.kitchenSection.findFirst({ where: tenantScope(ctx, { code }), select: { id: true } });
  if (holder) throw new SectionCodeTakenError(code);
}

/** Runs a section write, turning a concurrent duplicate code (unique `(tenant_id, code)`) into CODE_TAKEN. */
async function withCodeGuard<T>(code: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error)) throw new SectionCodeTakenError(code);
    throw error;
  }
}

/** SA-KSEC-01 — appended after the last active section (`kitchen_section.created`). */
export async function createKitchenSection(ctx: TenantContext, input: CreateKitchenSectionData): Promise<KitchenSectionDto> {
  return withTx(ctx, async (tx) => {
    await assertCodeFree(tx, ctx, input.code);
    const last = await tx.kitchenSection.aggregate({ where: tenantScope(ctx, { archivedAt: null }), _max: { sortOrder: true } });
    const sortOrder = Math.min((last._max.sortOrder ?? -1) + 1, MAX_SORT_ORDER);
    const created = await withCodeGuard(input.code, () =>
      tx.kitchenSection.create({ data: { tenantId: ctx.tenantId, name: input.name, code: input.code, sortOrder }, select: SECTION_SELECT }),
    );
    await audit(tx, ctx, { action: "kitchen_section.created", resourceType: "kitchen_section", resourceId: created.id, after: { ...created } });
    return created;
  });
}

/** SA-KSEC-02 — rename and/or recode an active section (`kitchen_section.updated`, changed fields only). */
export async function updateKitchenSection(ctx: TenantContext, input: UpdateKitchenSectionData): Promise<KitchenSectionDto> {
  return withTx(ctx, async (tx) => {
    const before = await findActive(tx, ctx, input.sectionId);
    const changes: { name?: string; code?: string } = {};
    if (input.name !== undefined && input.name !== before.name) changes.name = input.name;
    if (input.code !== undefined && input.code !== before.code) changes.code = input.code;
    if (Object.keys(changes).length === 0) return before;
    if (changes.code !== undefined) await assertCodeFree(tx, ctx, changes.code);

    const after = await withCodeGuard(changes.code ?? before.code, () =>
      tx.kitchenSection.update({ where: tenantKey(ctx, before.id), data: changes, select: SECTION_SELECT }),
    );
    const keys = Object.keys(changes) as Array<keyof typeof changes>;
    await audit(tx, ctx, {
      action: "kitchen_section.updated",
      resourceType: "kitchen_section",
      resourceId: after.id,
      before: Object.fromEntries(keys.map((k) => [k, before[k]])),
      after: Object.fromEntries(keys.map((k) => [k, after[k]])),
    });
    return after;
  });
}

/**
 * SA-KSEC-03 — archive (`kitchen_section.archived`). Refused with 409 SECTION_IN_USE while an active printer routes
 * to the section or a QUEUED/PREPARING KOT belongs to it (api.md). The row is locked so a second archive waits.
 */
export async function archiveKitchenSection(ctx: TenantContext, sectionId: string): Promise<KitchenSectionDto & { archivedAt: string }> {
  return withTx(ctx, async (tx) => {
    await tx.$queryRaw`SELECT id::text AS id FROM kitchen_sections WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${sectionId}::uuid FOR UPDATE`;
    const section = await findActive(tx, ctx, sectionId);

    const [printer, openKot] = await Promise.all([
      tx.printer.findFirst({ where: tenantScope(ctx, { kitchenSectionId: section.id, isActive: true }), select: { name: true } }),
      tx.kotTicket.findFirst({ where: tenantScope(ctx, { kitchenSectionId: section.id, status: { in: OPEN_KOT_STATUSES } }), select: { id: true } }),
    ]);
    const reasons = [
      ...(printer ? [`the active printer "${printer.name}" prints its tickets`] : []),
      ...(openKot ? ["it has kitchen tickets that are still queued or being prepared"] : []),
    ];
    if (reasons.length > 0) {
      throw new ConflictError(`This section can't be archived while ${reasons.join(" and ")}.`, "SECTION_IN_USE");
    }

    const archivedAt = new Date();
    const after = await tx.kitchenSection.update({ where: tenantKey(ctx, section.id), data: { archivedAt }, select: SECTION_SELECT });
    await audit(tx, ctx, {
      action: "kitchen_section.archived",
      resourceType: "kitchen_section",
      resourceId: after.id,
      before: { code: section.code, archivedAt: null },
      after: { code: after.code, archivedAt: archivedAt.toISOString() },
    });
    return { ...after, archivedAt: archivedAt.toISOString() };
  });
}

/**
 * SA-KSEC-04 — sets the board order of the tenant's active sections (`kitchen_section.reordered`). `orderedIds` must be
 * exactly the active set: an id that is not an active section of this tenant (another tenant's, archived, unknown)
 * is 404 and a missing section is 422; in both cases nothing changes.
 */
export async function reorderKitchenSections(ctx: TenantContext, orderedIds: readonly string[]): Promise<KitchenSectionDto[]> {
  return withTx(ctx, async (tx) => {
    // Lock the active set so concurrent reorders apply one after the other.
    await tx.$queryRaw`SELECT id::text AS id FROM kitchen_sections WHERE tenant_id = ${ctx.tenantId}::uuid AND archived_at IS NULL ORDER BY id FOR UPDATE`;
    const active = await tx.kitchenSection.findMany({
      where: tenantScope(ctx, { archivedAt: null }),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: SECTION_SELECT,
    });
    const activeIds = new Set(active.map((s) => s.id));
    if (orderedIds.some((id) => !activeIds.has(id))) throw new NotFoundError("Kitchen section not found");
    if (orderedIds.length !== active.length) {
      throw new ValidationError("Include every active kitchen section exactly once.", { orderedIds: ["Include every active kitchen section exactly once"] });
    }

    let updated = 0;
    for (const [index, id] of orderedIds.entries()) {
      const current = active.find((s) => s.id === id)!;
      if (current.sortOrder === index) continue;
      await tx.kitchenSection.update({ where: tenantKey(ctx, id), data: { sortOrder: index } });
      updated++;
    }
    if (updated === 0) return active;

    const after = await tx.kitchenSection.findMany({
      where: tenantScope(ctx, { archivedAt: null }),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: SECTION_SELECT,
    });
    await audit(tx, ctx, {
      action: "kitchen_section.reordered",
      resourceType: "kitchen_section",
      resourceId: null,
      before: { order: active.map((s) => s.code) },
      after: { order: after.map((s) => s.code) },
    });
    return after;
  });
}
