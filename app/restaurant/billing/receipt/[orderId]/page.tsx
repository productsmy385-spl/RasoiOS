import { notFound } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/guards";
import { getReceipt } from "@/lib/data/receipts";
import { parseParamOrNotFound, uuidParam } from "@/lib/validation/core";
import { PrintReceiptClient } from "./print-receipt-client";

export const dynamic = "force-dynamic";

interface ReceiptPageProps {
  params: Promise<{ orderId: string }>;
}

/**
 * Printable receipt (S1-P04-T008 closes BA-02; api.md LD-RCPT-01). Permission first, then a tenant-scoped lookup:
 * a malformed id, a missing order and another tenant's order all render the same not-found page.
 */
export default async function PrintableReceiptPage({ params }: ReceiptPageProps) {
  const ctx = await requireTenantPage("transaction:read");
  const { orderId: rawOrderId } = await params;
  const orderId = parseParamOrNotFound(uuidParam, rawOrderId);

  const receipt = await getReceipt(ctx, orderId);
  if (!receipt) notFound();

  return <PrintReceiptClient data={receipt} />;
}
