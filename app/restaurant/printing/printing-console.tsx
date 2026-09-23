"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PrintJobStatus, PrintJobType, PrinterHealth } from "@prisma/client";
import { CircleDashed, Pencil, Plus, PrinterCheck, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/states/empty-state";
import { StaleBanner } from "@/components/states/stale-banner";
import type { PrintJobDto, PrinterDto, PrintingConsole, PrintingConsoleAgent } from "@/lib/services/printing";
import { formatInZone } from "@/lib/ui/format";
import { DOMAIN_ICONS, type Tone } from "@/lib/ui/icons";
import { usePolling } from "@/lib/ui/use-polling";
import {
  createTestPrintJobAction,
  deactivatePrinterAction,
  getPrintingConsoleAction,
  retryPrintJobAction,
  revokePrintAgentAction,
} from "./actions";
import { PairAgentDialog } from "./pair-agent-dialog";
import { PrinterDialog } from "./printer-dialog";

/**
 * Printing console (S1-P16-T006/T009; api.md LD-PRN-01, RH-PRN-01, SA-PRN-01…05, SA-AGT-01/02).
 *
 * Three tabs over one honest picture of the print subsystem:
 * - **Queue** — the server's job rows, polled every 10 s (ADR-009). A job reads "Printed" only when the server says
 *   `PRINTED`, which happens only when an agent acknowledged it (BR-PRINT-01). There is no optimistic success here.
 * - **Printers** — each printer's health is the last thing its agent reported, with the time it was reported. When an
 *   agent has never reported, the health is "Not reported yet", not "Online" (BA-30).
 * - **Agents** — online is derived from `last_seen_at` within the 90 s heartbeat window (ADR-007 §7), never stored.
 *
 * Buttons appear only where the role holds the permission, and the server re-checks every one of them (SC-RBAC-08).
 */
const POLL_INTERVAL_MS = 10_000;

type Capabilities = { managePrinters: boolean; manageAgents: boolean; retryJobs: boolean };

const STATUS_TABS: ReadonlyArray<{ id: string; label: string; jobStatus?: PrintJobStatus }> = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Waiting", jobStatus: "PENDING" },
  { id: "PROCESSING", label: "Printing", jobStatus: "PROCESSING" },
  { id: "PRINTED", label: "Printed", jobStatus: "PRINTED" },
  { id: "FAILED", label: "Failed", jobStatus: "FAILED" },
];

const TYPE_TABS: ReadonlyArray<{ id: string; label: string; jobType?: PrintJobType }> = [
  { id: "ALL", label: "All types" },
  { id: "KOT", label: "Kitchen", jobType: "KOT" },
  { id: "RECEIPT", label: "Receipts", jobType: "RECEIPT" },
  { id: "TEST", label: "Tests", jobType: "TEST" },
];

const JOB_TYPE_LABELS: Record<PrintJobType, string> = { KOT: "Kitchen ticket", RECEIPT: "Receipt", TEST: "Test page" };

const PURPOSE_LABELS: Record<PrinterDto["purpose"], string> = {
  KOT: "Kitchen tickets",
  RECEIPT: "Receipts",
  KOT_AND_RECEIPT: "Kitchen tickets and receipts",
};

/** A printer's health is a report, not a measurement: `UNKNOWN` says so instead of implying a healthy device. */
const HEALTH: Record<PrinterHealth, { label: string; tone: Tone; icon: typeof PrinterCheck }> = {
  ONLINE: { label: "Online", tone: "success", icon: PrinterCheck },
  OFFLINE: { label: "Offline", tone: "danger", icon: WifiOff },
  ERROR: { label: "Error", tone: "danger", icon: TriangleAlert },
  UNKNOWN: { label: "Not reported yet", tone: "neutral", icon: CircleDashed },
};

function mergeJobs(current: readonly PrintJobDto[], delta: readonly PrintJobDto[]): PrintJobDto[] {
  if (delta.length === 0) return [...current];
  const byId = new Map(current.map((job) => [job.id, job]));
  for (const job of delta) byId.set(job.id, job);
  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function jobReference(job: PrintJobDto): string {
  return job.kotNumber ?? job.orderNumber ?? "—";
}

export function PrintingConsoleView({
  initial,
  timezone,
  sections,
  can,
}: {
  initial: PrintingConsole;
  timezone: string;
  sections: ReadonlyArray<{ id: string; name: string }>;
  can: Capabilities;
}) {
  const router = useRouter();
  const toast = useToast();
  const [jobs, setJobs] = React.useState<PrintJobDto[]>(() => [...initial.jobs]);
  const [printers, setPrinters] = React.useState<PrinterDto[]>(() => [...initial.printers]);
  const [agents, setAgents] = React.useState<PrintingConsoleAgent[]>(() => [...initial.agents]);
  const [statusTab, setStatusTab] = React.useState("ALL");
  const [typeTab, setTypeTab] = React.useState("ALL");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ open: boolean; printer: PrinterDto | null }>({ open: false, printer: null });
  const [pairing, setPairing] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState<PrinterDto | null>(null);
  const [revoking, setRevoking] = React.useState<PrintingConsoleAgent | null>(null);

  const onDelta = React.useCallback((page: { jobs: PrintJobDto[] }) => {
    setJobs((current) => mergeJobs(current, page.jobs));
  }, []);

  const { stale, lastSuccessAt, refetch } = usePolling<{ jobs: PrintJobDto[] }>({
    url: "/api/v1/print-jobs",
    intervalMs: POLL_INTERVAL_MS,
    onData: onDelta,
    select: (body) => {
      const page = body as { jobs: PrintJobDto[]; serverTime: string };
      return { data: page, cursor: page.serverTime };
    },
  });

  /** Printers and agents change rarely, so they are refreshed after a change rather than polled. */
  const reloadConsole = React.useCallback(async () => {
    const result = await getPrintingConsoleAction({});
    if (!result.ok) return;
    setPrinters(result.data.printers);
    setAgents(result.data.agents);
    setJobs((current) => mergeJobs(current, result.data.jobs));
  }, []);

  async function retry(job: PrintJobDto) {
    setBusyId(job.id);
    const result = await retryPrintJobAction({ jobId: job.id });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      void refetch();
      return;
    }
    setJobs((current) => mergeJobs(current, [result.data]));
    toast.success("Back in the queue. The agent picks it up on its next poll.");
    void refetch();
  }

  async function sendTestPrint(printer: PrinterDto) {
    setBusyId(printer.id);
    const result = await createTestPrintJobAction({ printerId: printer.id });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setJobs((current) => mergeJobs(current, [result.data]));
    toast.success(`Test page queued for ${printer.name}. It shows as Printed once the agent confirms.`);
    void refetch();
  }

  async function deactivate(printer: PrinterDto) {
    const result = await deactivatePrinterAction({ printerId: printer.id });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setDeactivating(null);
    toast.success(
      result.data.failedJobs > 0
        ? `${printer.name} deactivated. ${result.data.failedJobs} waiting job(s) were marked failed.`
        : `${printer.name} deactivated.`,
    );
    await reloadConsole();
    router.refresh();
  }

  async function revoke(agent: PrintingConsoleAgent) {
    const result = await revokePrintAgentAction({ agentId: agent.id });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setRevoking(null);
    toast.success(`${agent.name} revoked. Its token no longer works.`);
    await reloadConsole();
    router.refresh();
  }

  const wantedStatus = STATUS_TABS.find((tab) => tab.id === statusTab)?.jobStatus;
  const wantedType = TYPE_TABS.find((tab) => tab.id === typeTab)?.jobType;
  const visibleJobs = jobs.filter((job) => (wantedStatus ? job.status === wantedStatus : true) && (wantedType ? job.jobType === wantedType : true));
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;
  const offlineAgents = agents.filter((agent) => agent.status === "ACTIVE" && !agent.online).length;

  const columns: DataTableColumn<PrintJobDto>[] = [
    { key: "type", header: "Job", primary: true, text: (job) => `${JOB_TYPE_LABELS[job.jobType]}${job.isReprint ? " (reprint)" : ""}` },
    { key: "reference", header: "Ticket / order", text: jobReference },
    { key: "printer", header: "Printer", truncate: true, text: (job) => job.printer.name },
    { key: "status", header: "Status", cell: (job) => <StatusBadge domain="printJob" status={job.status} /> },
    { key: "attempts", header: "Attempts", numeric: true, text: (job) => `${job.attemptCount}/${job.maxAttempts}` },
    {
      key: "error",
      header: "Last error",
      truncate: true,
      cell: (job) =>
        job.lastErrorCode ? (
          <span className="text-status-danger">
            {job.lastErrorCode}
            {job.lastErrorMessage ? ` — ${job.lastErrorMessage}` : ""}
          </span>
        ) : (
          "—"
        ),
      text: (job) => (job.lastErrorCode ? `${job.lastErrorCode}${job.lastErrorMessage ? ` — ${job.lastErrorMessage}` : ""}` : "—"),
    },
    {
      key: "created",
      header: "Queued",
      cell: (job) => (
        <time dateTime={job.createdAt} title={job.createdAt}>
          {formatInZone(job.createdAt, timezone, "time", "en-GB")}
        </time>
      ),
      text: (job) => job.createdAt,
    },
  ];

  const queueTab = (
    <div className="flex flex-col gap-4">
      <StaleBanner stale={stale} lastSuccessAt={lastSuccessAt} timezone={timezone} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Print job status" className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusTab === tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-label transition-colors duration-fast ease-standard ${
                statusTab === tab.id ? "border-action-primary bg-action-primary/12 text-fg-accent" : "border-border-subtle bg-card text-fg-secondary hover:text-fg-primary"
              }`}
            >
              {tab.label}
              <span className="text-numeric text-caption">{jobs.filter((job) => (tab.jobStatus ? job.status === tab.jobStatus : true)).length}</span>
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Print job type" className="flex flex-wrap gap-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={typeTab === tab.id}
              onClick={() => setTypeTab(tab.id)}
              className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-label transition-colors duration-fast ease-standard ${
                typeTab === tab.id ? "border-action-primary bg-action-primary/12 text-fg-accent" : "border-border-subtle bg-card text-fg-secondary hover:text-fg-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={visibleJobs}
        getRowKey={(job) => job.id}
        caption="Print queue"
        empty={
          <EmptyState
            icon={DOMAIN_ICONS.printer}
            title="Nothing in the queue"
            description="Kitchen tickets are queued when an order is accepted, and receipts when you print one from an order."
          />
        }
        rowActions={(job) =>
          can.retryJobs && job.status === "FAILED" ? (
            <Button size="sm" variant="secondary" loading={busyId === job.id} loadingLabel="Queueing…" onClick={() => void retry(job)}>
              <Icon icon={RefreshCw} size={16} />
              Retry
            </Button>
          ) : null
        }
      />
    </div>
  );

  const printersTab = (
    <div className="flex flex-col gap-4">
      {can.managePrinters && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setEditing({ open: true, printer: null })}>
            <Icon icon={Plus} size={18} />
            Add printer
          </Button>
        </div>
      )}
      {printers.length === 0 ? (
        <Card>
          <EmptyState
            icon={DOMAIN_ICONS.printer}
            title="No printers yet"
            description="Add each thermal printer in the restaurant, then assign it to the print agent running on the PC it is connected to."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((printer) => {
            const health = HEALTH[printer.health];
            return (
              <li key={printer.id} className="flex">
                <Card className="w-full gap-3">
                  <CardHeader action={<Badge tone={printer.isActive ? health.tone : "neutral"} icon={printer.isActive ? health.icon : CircleDashed}>{printer.isActive ? health.label : "Deactivated"}</Badge>}>
                    <CardTitle>{printer.name}</CardTitle>
                    <CardDescription>{PURPOSE_LABELS[printer.purpose]}</CardDescription>
                  </CardHeader>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body">
                    <dt className="text-fg-secondary">Connection</dt>
                    <dd className="text-numeric text-fg-primary">
                      {printer.connectionType}
                      {printer.connectionAddress ? ` · ${printer.connectionAddress}` : ""}
                    </dd>
                    <dt className="text-fg-secondary">Paper</dt>
                    <dd className="text-fg-primary">{printer.paperWidthMm} mm</dd>
                    <dt className="text-fg-secondary">Station</dt>
                    <dd className="text-fg-primary">{printer.kitchenSectionName ?? "Any station"}</dd>
                    <dt className="text-fg-secondary">Agent</dt>
                    <dd className="text-fg-primary">
                      {printer.printAgentName ?? "Not assigned"}
                      {printer.printAgentStatus === "REVOKED" ? " (revoked)" : ""}
                    </dd>
                    <dt className="text-fg-secondary">Health reported</dt>
                    <dd className="text-fg-primary">
                      {printer.healthReportedAt ? formatInZone(printer.healthReportedAt, timezone, "datetime", "en-GB") : "Never"}
                    </dd>
                  </dl>
                  {can.managePrinters && printer.isActive && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Button size="sm" variant="secondary" onClick={() => setEditing({ open: true, printer })}>
                        <Icon icon={Pencil} size={16} />
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" loading={busyId === printer.id} loadingLabel="Queueing…" onClick={() => void sendTestPrint(printer)}>
                        Test print
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeactivating(printer)}>
                        Deactivate
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const agentsTab = (
    <div className="flex flex-col gap-4">
      {can.manageAgents && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setPairing(true)}>
            <Icon icon={Plus} size={18} />
            Pair agent
          </Button>
        </div>
      )}
      {agents.length === 0 ? (
        <Card>
          <EmptyState
            icon={DOMAIN_ICONS.agentOffline}
            title="No print agents yet"
            description="The print agent runs on a PC in the restaurant, collects queued jobs and sends them to the thermal printers."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {agents.map((agent) => (
            <li key={agent.id}>
              <Card className="flex-row items-center gap-4">
                <IconTile icon={agent.online ? DOMAIN_ICONS.agentOnline : DOMAIN_ICONS.agentOffline} tone={agent.online ? "success" : "neutral"} label="" />
                <div className="min-w-0 flex-1">
                  <p className="text-subheading text-fg-primary">{agent.name}</p>
                  <p className="text-caption text-fg-secondary">
                    {agent.status === "PENDING_PAIRING"
                      ? "Waiting to be paired"
                      : agent.lastSeenAt
                        ? `Last seen ${formatInZone(agent.lastSeenAt, timezone, "datetime", "en-GB")}`
                        : "Never connected"}
                    {agent.agentVersion ? ` · v${agent.agentVersion}` : ""}
                    {agent.tokenPrefix ? ` · token ${agent.tokenPrefix}…` : ""}
                  </p>
                </div>
                <StatusBadge domain="agent" status={agent.status === "REVOKED" ? "REVOKED" : agent.online ? "ONLINE" : "OFFLINE"} />
                {can.manageAgents && agent.status !== "REVOKED" && (
                  <Button size="sm" variant="ghost" onClick={() => setRevoking(agent)}>
                    Revoke
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {(failedCount > 0 || offlineAgents > 0) && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-label text-status-warning">
          <Icon icon={TriangleAlert} size={18} />
          {failedCount > 0 && <span>{failedCount === 1 ? "1 print job failed" : `${failedCount} print jobs failed`}</span>}
          {failedCount > 0 && offlineAgents > 0 && <span aria-hidden="true">·</span>}
          {offlineAgents > 0 && <span>{offlineAgents === 1 ? "1 agent offline" : `${offlineAgents} agents offline`}</span>}
        </p>
      )}

      <Tabs
        label="Printing sections"
        items={[
          { id: "queue", label: "Queue", icon: DOMAIN_ICONS.printer, content: queueTab },
          { id: "printers", label: "Printers", icon: DOMAIN_ICONS.printerOk, content: printersTab },
          { id: "agents", label: "Agents", icon: DOMAIN_ICONS.agentOnline, content: agentsTab },
        ]}
      />

      <PrinterDialog
        open={editing.open}
        printer={editing.printer}
        sections={sections}
        agents={agents.filter((agent) => agent.status !== "REVOKED").map((agent) => ({ id: agent.id, name: agent.name }))}
        onClose={() => setEditing({ open: false, printer: null })}
        onSaved={async (message) => {
          setEditing({ open: false, printer: null });
          toast.success(message);
          await reloadConsole();
          router.refresh();
        }}
      />

      <PairAgentDialog
        open={pairing}
        onClose={async () => {
          setPairing(false);
          await reloadConsole();
          router.refresh();
        }}
        onPaired={() => void reloadConsole()}
      />

      <ConfirmDialog
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title={deactivating ? `Deactivate ${deactivating.name}?` : "Deactivate printer?"}
        description="Jobs still waiting for this printer are marked failed. Tickets will route to the fallback printer, if there is one."
        confirmLabel="Deactivate"
        tone="destructive"
        onConfirm={() => (deactivating ? deactivate(deactivating) : undefined)}
      />

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={revoking ? `Revoke ${revoking.name}?` : "Revoke agent?"}
        description="The device stops collecting jobs immediately. Pair it again with a new code if you need it back."
        confirmLabel="Revoke"
        tone="destructive"
        onConfirm={() => (revoking ? revoke(revoking) : undefined)}
      />
    </div>
  );
}
