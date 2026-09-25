"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { KotStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/states/empty-state";
import { StaleBanner } from "@/components/states/stale-banner";
import type { BoardPage, BoardTicket } from "@/lib/data/kitchen";
import type { KitchenSectionOption } from "@/lib/data/kot";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import { usePolling } from "@/lib/ui/use-polling";
import { updateKOTStatusAction } from "@/app/restaurant/kitchen/actions";
import { KITCHEN_NEXT, KotCard } from "./kot-card";

/**
 * Kitchen board (S1-P15-T002; frontend.md §5.3, api.md LD-KOT-01 / RH-KOT-01 / SA-KOT-01).
 *
 * The first page is rendered on the server; the board then polls `GET /api/v1/kitchen/tickets?since=` every 5 seconds
 * (ADR-009), merges the delta by ticket id and drops anything that has left the queue. Three columns on a landscape
 * tablet, one column with a segmented filter on a phone. The chosen section is the only thing kept on the device
 * (FE-08) — never a tenant id.
 *
 * `allowedTargets` is the server's answer to what this role may do; the card shows one action and the server checks
 * it again on every request (SC-RBAC-08).
 */
const POLL_INTERVAL_MS = 5_000;
const SECTION_STORAGE_KEY = "rasoi.kitchen.section";

const COLUMNS: Array<{ status: KotStatus; title: string }> = [
  { status: "QUEUED", title: "Queued" },
  { status: "PREPARING", title: "Preparing" },
  { status: "READY", title: "Ready" },
];

const ON_BOARD: readonly KotStatus[] = ["QUEUED", "PREPARING", "READY"];

function merge(current: readonly BoardTicket[], delta: readonly BoardTicket[]): BoardTicket[] {
  const byId = new Map(current.map((ticket) => [ticket.id, ticket]));
  for (const ticket of delta) {
    if (ON_BOARD.includes(ticket.status)) byId.set(ticket.id, ticket);
    else byId.delete(ticket.id);
  }
  return [...byId.values()].sort((a, b) =>
    a.priority === b.priority ? Date.parse(a.queuedAt) - Date.parse(b.queuedAt) : a.priority === "HIGH" ? -1 : 1,
  );
}

export function KitchenBoard({
  initial,
  sections,
  timezone,
  allowedTargets,
}: {
  initial: BoardPage;
  sections: readonly KitchenSectionOption[];
  timezone: string;
  /** Which KOT targets this role may request (`kot:update_status` / `kot:serve`). */
  allowedTargets: readonly KotStatus[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tickets, setTickets] = React.useState<BoardTicket[]>(() => merge([], initial.tickets));
  const [sectionId, setSectionId] = React.useState<string>("ALL");
  const [column, setColumn] = React.useState<KotStatus>("QUEUED");
  const [now, setNow] = React.useState(() => Date.now());
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  // The section the cook chose is a device preference, so it survives a reload of this screen only.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SECTION_STORAGE_KEY);
      if (stored && (stored === "ALL" || sections.some((section) => section.id === stored))) setSectionId(stored);
    } catch {
      // Private mode or blocked storage: the board simply starts on every section.
    }
  }, [sections]);

  function chooseSection(next: string) {
    setSectionId(next);
    try {
      window.localStorage.setItem(SECTION_STORAGE_KEY, next);
    } catch {
      // Nothing to do: the choice just will not survive a reload.
    }
  }

  // Timers tick every 15 s: often enough for a kitchen, rare enough to stay cheap.
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const onDelta = React.useCallback((page: BoardPage) => {
    setTickets((current) => merge(current, page.tickets));
  }, []);

  const { stale, lastSuccessAt, refetch } = usePolling<BoardPage>({
    url: "/api/v1/kitchen/tickets",
    intervalMs: POLL_INTERVAL_MS,
    onData: onDelta,
    select: (body) => {
      const page = body as BoardPage;
      return { data: page, cursor: page.serverTime };
    },
  });

  async function advance(ticket: BoardTicket, to: KotStatus) {
    setPendingId(ticket.id);
    const result = await updateKOTStatusAction({ kotId: ticket.id, toStatus: to });
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error.message);
      void refetch();
      return;
    }
    // Take the server's answer, then re-poll so the rest of the board catches up.
    setTickets((current) => merge(current, [{ ...ticket, status: result.data.status }]));
    void refetch();
    router.refresh();
  }

  const inSection = tickets.filter((ticket) => sectionId === "ALL" || ticket.sectionId === sectionId);
  const byColumn = (status: KotStatus) => inSection.filter((ticket) => ticket.status === status);

  function renderCard(ticket: BoardTicket) {
    const next = KITCHEN_NEXT[ticket.status];
    const action = next && allowedTargets.includes(next.to) ? next : null;
    return (
      <li key={ticket.id} className="flex">
        <KotCard ticket={ticket} now={now} action={action} pending={pendingId === ticket.id} onAdvance={(to) => void advance(ticket, to)} />
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StaleBanner stale={stale} lastSuccessAt={lastSuccessAt} timezone={timezone} />

      {sections.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Kitchen section">
          <SectionButton label="All sections" active={sectionId === "ALL"} onClick={() => chooseSection("ALL")} />
          {sections.map((section) => (
            <SectionButton key={section.id} label={section.name} active={sectionId === section.id} onClick={() => chooseSection(section.id)} />
          ))}
        </div>
      )}

      {/* Below lg one column at a time, chosen with a segmented control. */}
      {/* Three equal columns that may shrink: on a narrow phone the count moves under the label instead of pushing the
          row wider than the screen; each button stays a 48 px touch target. */}
      <div className="grid grid-cols-3 gap-2 lg:hidden" role="group" aria-label="Ticket status">
        {COLUMNS.map((entry) => (
          <button
            key={entry.status}
            type="button"
            aria-pressed={column === entry.status}
            onClick={() => setColumn(entry.status)}
            className={`inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0 rounded-xl border px-2 py-1 text-label transition-colors duration-fast ease-standard min-[400px]:flex-row min-[400px]:gap-2 min-[400px]:px-3 sm:text-subheading ${
              column === entry.status ? "border-action-primary bg-action-primary/12 text-fg-accent" : "border-border-subtle bg-card text-fg-secondary"
            }`}
          >
            {entry.title}
            <span className="text-numeric">{byColumn(entry.status).length}</span>
          </button>
        ))}
      </div>

      <div className="lg:hidden">
        <Column title={COLUMNS.find((entry) => entry.status === column)!.title} tickets={byColumn(column)} renderCard={renderCard} />
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        {COLUMNS.map((entry) => (
          <Column key={entry.status} title={entry.title} tickets={byColumn(entry.status)} renderCard={renderCard} showHeading />
        ))}
      </div>
    </div>
  );
}

function Column({
  title,
  tickets,
  renderCard,
  showHeading = false,
}: {
  title: string;
  tickets: readonly BoardTicket[];
  renderCard: (ticket: BoardTicket) => React.ReactNode;
  showHeading?: boolean;
}) {
  return (
    <section aria-label={`${title} tickets`} className="flex min-w-0 flex-col gap-4">
      {showHeading && (
        <h2 className="flex items-baseline gap-2 text-heading text-fg-primary">
          {title}
          <span className="text-subheading text-numeric text-fg-secondary">{tickets.length}</span>
        </h2>
      )}
      {tickets.length === 0 ? (
        <Card>
          <EmptyState icon={DOMAIN_ICONS.kitchen} title={`No tickets ${title.toLowerCase()}`} description="Tickets appear here as orders reach the kitchen." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">{tickets.map(renderCard)}</ul>
      )}
    </section>
  );
}

function SectionButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-12 shrink-0 items-center rounded-xl border px-4 text-subheading transition-colors duration-fast ease-standard ${
        active ? "border-action-primary bg-action-primary/12 text-fg-accent" : "border-border-subtle bg-card text-fg-secondary hover:text-fg-primary"
      }`}
    >
      {label}
    </button>
  );
}
