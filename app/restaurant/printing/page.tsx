import { PageHeader } from "@/components/layout/page-header";
import { requireTenantPage } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrintingConsole, listPrintingSections } from "@/lib/services/printing";
import { PrintingConsoleView } from "./printing-console";

export const dynamic = "force-dynamic";

/**
 * LD-PRN-01 — `/restaurant/printing` (S1-P16-T006, `print_job:read`).
 *
 * The first view is rendered on the server; the queue then polls RH-PRN-01 every 10 s (ADR-009). Printer and agent
 * management need their own permissions (`printer:manage`, `print_agent:manage`, security.md §3.3 rows 44–45): the
 * capabilities passed down decide what the page *shows*, and the server re-checks each action anyway (SC-RBAC-08).
 */
export default async function PrintingPage() {
  const ctx = await requireTenantPage("print_job:read");
  const canManagePrinters = hasPermission(ctx, "printer:manage");
  const [view, sections] = await Promise.all([getPrintingConsole(ctx), canManagePrinters ? listPrintingSections(ctx) : Promise.resolve([])]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Printing"
        description="Kitchen tickets and receipts are queued here and collected by the print agent running in the restaurant."
      />
      <PrintingConsoleView
        initial={view}
        timezone={ctx.restaurant.timezone}
        sections={sections}
        can={{
          managePrinters: canManagePrinters,
          manageAgents: hasPermission(ctx, "print_agent:manage"),
          retryJobs: hasPermission(ctx, "print_job:retry"),
        }}
      />
    </div>
  );
}
