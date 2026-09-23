/**
 * Kitchen / KOT action inputs (S1-P04-T007 interim; api.md LD-KOT-01, SA-KOT-01). Strict objects: an extra key such as
 * `tenantId` is rejected with 422 (SC-TEN-01, ADV-001). The tenant always comes from the server-resolved context.
 */
import { KotStatus } from "@prisma/client";
import { z } from "zod";
import { strictObject, uuidParam } from "./core";

/** Kitchen board filters. No status = the active queue (QUEUED, PREPARING, READY). */
export const kotListFiltersSchema = strictObject({
  status: z.nativeEnum(KotStatus).optional(),
  kitchenSectionId: uuidParam.optional(),
});

/** SA-KOT-01. The state machine in `lib/services/kot.ts` decides which targets are reachable (409 INVALID_TRANSITION). */
export const updateKotStatusSchema = strictObject({
  kotId: uuidParam,
  toStatus: z.nativeEnum(KotStatus),
});

/**
 * RH-KOT-01 poll query (S1-P15-T001). `since` is the previous response's `serverTime` (ISO instant), so the cursor
 * comes from the server's clock, never the device's. Query strings arrive as strings, so each value is coerced here.
 */
export const kitchenPollSchema = strictObject({
  since: z
    .string()
    .datetime({ offset: true, message: "since must be an ISO timestamp from a previous response" })
    .transform((value) => new Date(value))
    .optional(),
  section: uuidParam.optional(),
  status: z.nativeEnum(KotStatus).optional(),
  limit: z.coerce.number().int().min(1, "limit must be at least 1").max(200, "limit must be at most 200").optional(),
});

export type KitchenPollInput = z.input<typeof kitchenPollSchema>;
export type KotListFiltersInput = z.input<typeof kotListFiltersSchema>;
export type UpdateKotStatusInput = z.input<typeof updateKotStatusSchema>;
