"use server";

import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { getTenantCustomers } from "@/lib/services/orders";

export async function getCustomersAction(query?: string, requestedTenantId?: string) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);

  const customers = await getTenantCustomers(context.tenantId, query);
  return { success: true, customers };
}
