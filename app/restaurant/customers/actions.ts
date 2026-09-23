"use server";

import { requireTenant } from "@/lib/auth/guards";
import { action } from "@/lib/http/action";
import {
  anonymizeCustomer,
  archiveCustomer,
  createCustomer,
  getCustomerHistory,
  getCustomers,
  updateCustomer,
} from "@/lib/services/customers";
import { parseInput } from "@/lib/validation/core";
import {
  anonymizeCustomerSchema,
  createCustomerSchema,
  customerHistorySchema,
  customerRefSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
  type AnonymizeCustomerInput,
  type CreateCustomerInput,
  type CustomerHistoryInput,
  type CustomerRefInput,
  type ListCustomersQueryInput,
  type UpdateCustomerInput,
} from "@/lib/validation/customers";

/**
 * Customers (S1-P13-T001; api.md LD-CUS-01/02, SA-CUS-01…04; security.md §3.3 rows 35–38). The permission is checked
 * before any input is read, the customer is always one of the session's tenant (another tenant's id → 404, TI-034),
 * and personal data is masked in audit rows and logs (SC-PII-03).
 */

/** LD-CUS-01 — `customer:read`. */
export const getCustomersAction = action(async (input?: ListCustomersQueryInput) => {
  const ctx = await requireTenant("customer:read");
  const query = parseInput(listCustomersQuerySchema, input ?? {});
  return { customers: await getCustomers(ctx, query) };
});

/** LD-CUS-02 — `customer:read`: one customer with their order history (amounts need `transaction:read`). */
export const getCustomerHistoryAction = action(async (input: CustomerHistoryInput) => {
  const ctx = await requireTenant("customer:read");
  const data = parseInput(customerHistorySchema, input);
  return getCustomerHistory(ctx, data);
});

/** SA-CUS-01 — `customer:create`; 409 PHONE_EXISTS when the number belongs to another active customer. */
export const createCustomerAction = action(async (input: CreateCustomerInput) => {
  const ctx = await requireTenant("customer:create");
  const data = parseInput(createCustomerSchema, input);
  return createCustomer(ctx, data);
});

/** SA-CUS-02 — `customer:update`. */
export const updateCustomerAction = action(async (input: UpdateCustomerInput) => {
  const ctx = await requireTenant("customer:update");
  const data = parseInput(updateCustomerSchema, input);
  return updateCustomer(ctx, data);
});

/** SA-CUS-03 — `customer:archive`: hidden from lists and lookup, orders keep the link. */
export const archiveCustomerAction = action(async (input: CustomerRefInput) => {
  const ctx = await requireTenant("customer:archive");
  const { customerId } = parseInput(customerRefSchema, input);
  return archiveCustomer(ctx, customerId);
});

/** SA-CUS-04 — `customer:archive` and TENANT_ADMIN: irreversible erasure of the personal data. */
export const anonymizeCustomerAction = action(async (input: AnonymizeCustomerInput) => {
  const ctx = await requireTenant("customer:archive");
  const { customerId } = parseInput(anonymizeCustomerSchema, input);
  return anonymizeCustomer(ctx, customerId);
});
