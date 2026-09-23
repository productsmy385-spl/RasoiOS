import "server-only";
import type { TenantContext } from "@/lib/auth/context-types";
import {
  archiveKitchenSection,
  createKitchenSection,
  listKitchenSections,
  reorderKitchenSections,
  updateKitchenSection,
  type KitchenSectionDto,
} from "@/lib/data/kitchen-sections";
import { logger } from "@/lib/logger";
import type { CreateKitchenSectionData, UpdateKitchenSectionData } from "@/lib/validation/settings";

/**
 * Kitchen section services (S1-P07-T003, api.md SA-KSEC-01…04, REQ-REST-009, REQ-KOT-009). Sections route menu
 * items, printers and KOTs; the in-use rule (no archive while an active printer or an open KOT uses the section) and the
 * full-set reorder rule are enforced in the same transaction as the write (`lib/data/kitchen-sections.ts`).
 * Callers have already passed `requireTenant("kitchen_section:manage")` (security.md §3.3 row 13).
 */

export type { KitchenSectionDto };

export function listSections(ctx: TenantContext): Promise<KitchenSectionDto[]> {
  return listKitchenSections(ctx);
}

/** SA-KSEC-01 — 422 CODE_TAKEN when the code is used by any section of this tenant (including archived ones). */
export async function createSection(ctx: TenantContext, input: CreateKitchenSectionData): Promise<KitchenSectionDto> {
  const section = await createKitchenSection(ctx, input);
  logger.info("kitchen_section.created", { requestId: ctx.requestId, tenantId: ctx.tenantId, sectionId: section.id });
  return section;
}

/** SA-KSEC-02 — 404 for another tenant's, an archived or an unknown section. */
export function updateSection(ctx: TenantContext, input: UpdateKitchenSectionData): Promise<KitchenSectionDto> {
  return updateKitchenSection(ctx, input);
}

/** SA-KSEC-03 — 409 SECTION_IN_USE while an active printer routes to it or a QUEUED/PREPARING KOT belongs to it. */
export async function archiveSection(ctx: TenantContext, sectionId: string): Promise<KitchenSectionDto & { archivedAt: string }> {
  const section = await archiveKitchenSection(ctx, sectionId);
  logger.info("kitchen_section.archived", { requestId: ctx.requestId, tenantId: ctx.tenantId, sectionId: section.id });
  return section;
}

/** SA-KSEC-04 — `orderedIds` must be exactly the tenant's active sections (foreign/unknown id → 404; missing → 422). */
export function reorderSections(ctx: TenantContext, orderedIds: readonly string[]): Promise<KitchenSectionDto[]> {
  return reorderKitchenSections(ctx, orderedIds);
}
