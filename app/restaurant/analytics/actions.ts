"use server";

import { getAuthenticatedSession } from "@/lib/auth/clerk";
import { resolveTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { getTenantSalesAnalytics, Timeframe } from "@/lib/services/analytics";

export async function getAnalyticsAction(
  timeframe: Timeframe = "30d",
  requestedTenantId?: string
) {
  const session = await getAuthenticatedSession();
  const context = resolveTenantContext(session, requestedTenantId);
  requirePermission(context, "reports:view");

  const analytics = await getTenantSalesAnalytics(context.tenantId, timeframe);
  return { success: true, analytics };
}
