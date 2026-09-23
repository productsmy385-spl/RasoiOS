/**
 * Customer inputs (S1-P13-T001; api.md SA-CUS-01…04, LD-CUS-01/02, RH-CUS-01). Strict objects: a `tenantId` or any
 * other unknown key is 422 (SC-TEN-01). Phone numbers are normalised to E.164 here, so the service and the database
 * only ever see one shape of the same number.
 */
import { z } from "zod";
import { boundedText, e164Field, emailField, optionalText, strictObject, uuidParam } from "./core";

/**
 * An optional contact field. On create, leaving it out means "no value"; on update it means "leave it alone", and
 * only an empty string clears it — so a form that omits a field can never wipe data it never showed.
 */
const clearable = <T extends z.ZodTypeAny>(field: T) =>
  z
    .union([z.literal(""), field])
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));

const createField = <T extends z.ZodTypeAny>(field: T) =>
  z
    .union([z.literal(""), field])
    .optional()
    .transform((value) => value || null);

const notesField = z.string().trim().max(500, "Notes must be at most 500 characters");

export const createCustomerSchema = strictObject({
  fullName: boundedText(120, { min: 2, label: "Customer name" }),
  phoneE164: createField(e164Field),
  email: createField(emailField),
  notes: createField(notesField),
});
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type CreateCustomerData = z.output<typeof createCustomerSchema>;

export const updateCustomerSchema = strictObject({
  customerId: uuidParam,
  fullName: boundedText(120, { min: 2, label: "Customer name" }).optional(),
  phoneE164: clearable(e164Field),
  email: clearable(emailField),
  // `clearable`, not `optionalText`: an update that does not mention the notes must leave them alone. `optionalText`
  // turns an omitted field into null, which would erase notes a form never showed [fixed 2026-09-23, TC-CUST-008].
  notes: clearable(notesField),
});
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type UpdateCustomerData = z.output<typeof updateCustomerSchema>;

export const customerRefSchema = strictObject({ customerId: uuidParam });
export type CustomerRefInput = z.input<typeof customerRefSchema>;

/** SA-CUS-04: irreversible, so the caller types the word back to confirm. */
export const ANONYMISE_CONFIRM_PHRASE = "ANONYMISE";
export const anonymizeCustomerSchema = strictObject({
  customerId: uuidParam,
  confirmPhrase: z.literal(ANONYMISE_CONFIRM_PHRASE, {
    errorMap: () => ({ message: `Type ${ANONYMISE_CONFIRM_PHRASE} to confirm` }),
  }),
});
export type AnonymizeCustomerInput = z.input<typeof anonymizeCustomerSchema>;

export const listCustomersQuerySchema = strictObject({
  query: optionalText(100, "Search"),
  includeArchived: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(200).optional(),
});
export type ListCustomersQueryInput = z.input<typeof listCustomersQuerySchema>;
export type ListCustomersQueryData = z.output<typeof listCustomersQuerySchema>;

/** LD-CUS-02 — one customer with their order history, newest first. */
export const customerHistorySchema = strictObject({
  customerId: uuidParam,
  cursor: uuidParam.optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
export type CustomerHistoryInput = z.input<typeof customerHistorySchema>;
export type CustomerHistoryData = z.output<typeof customerHistorySchema>;

/** RH-CUS-01 — POS lookup: 3–40 characters, at most 10 results, rate limited. */
export const customerLookupSchema = strictObject({
  q: z.string().trim().min(3, "Type at least 3 characters").max(40, "Search is too long"),
});
export type CustomerLookupInput = z.input<typeof customerLookupSchema>;
