"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import { archiveSection, createSection, reorderSections, updateSection } from "@/lib/services/kitchen-sections";
import { parseInput } from "@/lib/validation/core";
import {
  createKitchenSectionSchema,
  kitchenSectionIdSchema,
  reorderKitchenSectionsSchema,
  updateKitchenSectionSchema,
  type CreateKitchenSectionInput,
  type KitchenSectionIdInput,
  type ReorderKitchenSectionsInput,
  type UpdateKitchenSectionInput,
} from "@/lib/validation/settings";

/**
 * Kitchen sections (S1-P07-T003; api.md SA-KSEC-01…04). `kitchen_section:manage` (security.md §3.3 row 13) is checked
 * before any input is read or row loaded; another tenant's section id is 404 like an unknown one (TI-019, TI-020).
 * The active list is part of LD-RST-01 (`getRestaurantSettingsAction`).
 */

/** SA-KSEC-01 — `{ name, code }`; 422 CODE_TAKEN (`kitchen_section.created`). */
export const createKitchenSectionAction = action(async (input: CreateKitchenSectionInput) => {
  const ctx = await requireTenant("kitchen_section:manage");
  const data = parseInput(createKitchenSectionSchema, input);
  return createSection(ctx, data);
});

/** SA-KSEC-02 — `{ sectionId, name?, code? }` (`kitchen_section.updated`). */
export const updateKitchenSectionAction = action(async (input: UpdateKitchenSectionInput) => {
  const ctx = await requireTenant("kitchen_section:manage");
  const data = parseInput(updateKitchenSectionSchema, input);
  return updateSection(ctx, data);
});

/** SA-KSEC-03 — `{ sectionId }`; 409 SECTION_IN_USE (`kitchen_section.archived`). */
export const archiveKitchenSectionAction = action(async (input: KitchenSectionIdInput) => {
  const ctx = await requireTenant("kitchen_section:manage");
  const { sectionId } = parseInput(kitchenSectionIdSchema, input);
  return archiveSection(ctx, sectionId);
});

/** SA-KSEC-04 — `{ orderedIds }` equal to the active set (`kitchen_section.reordered`). */
export const reorderKitchenSectionsAction = action(async (input: ReorderKitchenSectionsInput) => {
  const ctx = await requireTenant("kitchen_section:manage");
  const { orderedIds } = parseInput(reorderKitchenSectionsSchema, input);
  return reorderSections(ctx, orderedIds);
});
