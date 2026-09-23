import { CalendarDays, CircleCheck, CircleDashed } from "lucide-react";
import type { PublicOpeningDay } from "@/lib/data/public-restaurant";
import { cn } from "@/lib/ui/cn";
import { SectionEmpty } from "./primitives";

/**
 * Opening hours and the open-now indicator (S1-P09-T003, REQ-WEB-006).
 *
 * The week and the open/closed answer are both computed server-side in the *restaurant's* IANA time zone — never the
 * viewer's, never the server's (TC-TZ-002). A restaurant that has published no hours says so; nothing is guessed.
 */

/** Weekday names for a locale, Monday first. 2024-01-01 was a Monday, so the offsets are stable. */
function weekdayNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, 1 + index))));
}

/** A wall-clock `HH:MM` shown in the reader's locale conventions (12- or 24-hour), without any zone conversion. */
export function formatWallClock(hhmm: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(`1970-01-01T${hhmm}:00.000Z`));
}

export function OpenNowBadge({ openNow, className }: { openNow: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-caption",
        openNow ? "bg-status-success/12 text-status-success" : "bg-fg-secondary/12 text-fg-secondary",
        className,
      )}
    >
      {openNow ? <CircleCheck width={16} height={16} strokeWidth={2} aria-hidden="true" /> : <CircleDashed width={16} height={16} strokeWidth={2} aria-hidden="true" />}
      {openNow ? "Open now" : "Closed now"}
    </span>
  );
}

export function HoursTable({
  hours,
  timezone,
  locale,
  todayWeekday,
}: {
  hours: readonly PublicOpeningDay[];
  timezone: string;
  locale: string;
  /** ISO weekday (1 = Monday) of "today" in the restaurant's time zone. */
  todayWeekday: number;
}) {
  const names = weekdayNames(locale);
  const open = hours.filter((day) => !day.isClosed);
  if (open.length === 0) return <SectionEmpty icon={CalendarDays}>This restaurant has not published its opening hours yet.</SectionEmpty>;

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-card">
        {hours.map((day) => {
          const today = day.dayOfWeek === todayWeekday;
          return (
            <div key={day.dayOfWeek} className={cn("flex items-baseline justify-between gap-4 px-4 py-3", today && "bg-action-primary/12")}>
              <dt className={cn("text-body", today ? "text-fg-primary font-semibold" : "text-fg-secondary")}>
                {names[day.dayOfWeek - 1]}
                {today ? <span className="text-caption text-fg-accent"> · today</span> : null}
              </dt>
              <dd className="text-numeric text-body text-right">
                {day.isClosed
                  ? "Closed"
                  : day.shifts.map((shift) => `${formatWallClock(shift.opensAt, locale)} – ${formatWallClock(shift.closesAt, locale)}`).join(", ")}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-caption text-fg-secondary">All times are local to the restaurant ({timezone}).</p>
    </div>
  );
}
