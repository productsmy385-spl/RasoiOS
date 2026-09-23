"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Plus, Trash2 } from "lucide-react";
import { replaceOpeningHoursAction } from "@/app/restaurant/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { TimeField } from "@/components/ui/inputs/text-field";
import { Switch } from "@/components/ui/inputs/switch";
import { useToast } from "@/components/ui/toast";
import { DAY_NAMES, MAX_SHIFTS_PER_DAY, openingHoursIssues, type OpeningDay } from "@/lib/validation/settings";

/**
 * Opening hours (S1-P07-T005; api.md SA-RST-03). The whole week is one form: SA-RST-03 replaces all seven days at
 * once, so saving half a week is not a thing the server can do and not a thing this editor offers.
 *
 * A day is closed or has one to three shifts. A shift whose closing time is earlier than its opening time closes after
 * midnight — the editor says so instead of calling it an error, because that is how a late kitchen actually works. The
 * same `openingHoursIssues` the server runs is used here for immediate feedback, so what is refused is refused before
 * the round trip, and a refusal that still comes back from the server is shown on the shift that caused it.
 */
type Props = { hours: OpeningDay[]; canEdit: boolean; timezone: string };

const emptyShift = () => ({ opensAt: "09:00", closesAt: "22:00" });

/** "days.2.shifts.1.closesAt" → the message for that field. */
type FieldErrors = Record<string, string[]>;

export function HoursEditor({ hours, canEdit, timezone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [days, setDays] = React.useState<OpeningDay[]>(() => normalise(hours));
  const [serverErrors, setServerErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const issues = openingHoursIssues(days);
  const issueFor = (path: (string | number)[]) => issues.find((issue) => issue.path.join(".") === path.join("."))?.message;
  const errorFor = (path: (string | number)[]) => issueFor(path) ?? serverErrors[path.join(".")]?.[0];

  function edit(index: number, change: (day: OpeningDay) => OpeningDay) {
    setDirty(true);
    setServerErrors({});
    setDays((current) => current.map((day, i) => (i === index ? change(day) : day)));
  }

  function copyFirstOpenDayToAll() {
    const source = days.find((day) => !day.isClosed);
    if (!source) return;
    setDirty(true);
    setServerErrors({});
    setDays((current) => current.map((day) => ({ ...day, isClosed: false, shifts: source.shifts.map((shift) => ({ ...shift })) })));
    toast.success(`${DAY_NAMES[source.dayOfWeek - 1]}'s hours copied to every day. Review and save.`);
  }

  async function save() {
    setSaving(true);
    const result = await replaceOpeningHoursAction({ days });
    setSaving(false);
    if (result.ok) {
      setServerErrors({});
      setDirty(false);
      toast.success("Opening hours saved.");
      router.refresh();
      return;
    }
    setServerErrors(result.error.fieldErrors ?? {});
    toast.error(result.error.message);
  }

  return (
    <Card padding="feature">
      <div className="flex flex-col gap-2">
        <p className="text-body text-fg-secondary">
          The hours diners see on the website, in {timezone}. A day with no shifts is shown as closed.
        </p>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={CopyPlus} onClick={copyFirstOpenDayToAll} disabled={days.every((day) => day.isClosed)}>
              Copy the first open day to every day
            </Button>
          </div>
        )}
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {days.map((day, index) => {
          const name = DAY_NAMES[day.dayOfWeek - 1];
          const shiftsError = errorFor(["days", index, "shifts"]);
          return (
            <li key={day.dayOfWeek} className="flex flex-col gap-3 border-b border-border-subtle pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
              <div className="sm:w-40 sm:shrink-0">
                <Switch
                  label={name}
                  checked={!day.isClosed}
                  disabled={!canEdit}
                  onChange={(event) =>
                    edit(index, (current) => ({
                      ...current,
                      isClosed: !event.target.checked,
                      shifts: event.target.checked ? (current.shifts.length > 0 ? current.shifts : [emptyShift()]) : [],
                    }))
                  }
                  help={day.isClosed ? "Closed" : undefined}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {day.isClosed ? (
                  <p className="text-body text-fg-secondary">Closed all day.</p>
                ) : (
                  day.shifts.map((shift, shiftIndex) => {
                    const overnight = shift.closesAt < shift.opensAt;
                    return (
                      <div key={shiftIndex} className="flex flex-wrap items-start gap-3">
                        <TimeField
                          label={shiftIndex === 0 ? "Opens" : "Opens again"}
                          value={shift.opensAt}
                          disabled={!canEdit}
                          className="w-36"
                          error={errorFor(["days", index, "shifts", shiftIndex, "opensAt"])}
                          onChange={(event) =>
                            edit(index, (current) => ({ ...current, shifts: current.shifts.map((s, i) => (i === shiftIndex ? { ...s, opensAt: event.target.value } : s)) }))
                          }
                        />
                        <TimeField
                          label="Closes"
                          value={shift.closesAt}
                          disabled={!canEdit}
                          className="w-36"
                          help={overnight ? "After midnight" : undefined}
                          error={errorFor(["days", index, "shifts", shiftIndex, "closesAt"]) ?? errorFor(["days", index, "shifts", shiftIndex])}
                          onChange={(event) =>
                            edit(index, (current) => ({ ...current, shifts: current.shifts.map((s, i) => (i === shiftIndex ? { ...s, closesAt: event.target.value } : s)) }))
                          }
                        />
                        {canEdit && day.shifts.length > 1 && (
                          <IconButton
                            icon={Trash2}
                            aria-label={`Remove ${name} shift ${shiftIndex + 1}`}
                            className="mt-7"
                            onClick={() => edit(index, (current) => ({ ...current, shifts: current.shifts.filter((_, i) => i !== shiftIndex) }))}
                          />
                        )}
                      </div>
                    );
                  })
                )}

                {shiftsError && <p className="text-caption text-status-danger">{shiftsError}</p>}

                {canEdit && !day.isClosed && day.shifts.length < MAX_SHIFTS_PER_DAY && (
                  <div>
                    <Button variant="ghost" icon={Plus} onClick={() => edit(index, (current) => ({ ...current, shifts: [...current.shifts, emptyShift()] }))}>
                      Add a break in the day
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {issues.length > 0 && (
        <Alert tone="warning" title="These hours can't be saved yet" className="mt-6">
          <ul className="list-disc pl-5">
            {issues.map((issue) => (
              <li key={issue.path.join(".")}>
                {DAY_NAMES[(days[Number(issue.path[1])]?.dayOfWeek ?? 1) - 1]}: {issue.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {canEdit && (
        <div className="mt-6 flex items-center justify-end gap-3">
          {dirty && <p className="text-caption text-fg-secondary">Unsaved changes</p>}
          <Button onClick={save} loading={saving} loadingLabel="Saving…" disabled={issues.length > 0}>
            Save opening hours
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Seven days, Monday first, whatever the loader returned (a day it did not mention is closed). */
function normalise(hours: OpeningDay[]): OpeningDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const dayOfWeek = index + 1;
    const found = hours.find((day) => day.dayOfWeek === dayOfWeek);
    return { dayOfWeek, isClosed: found?.isClosed ?? true, shifts: (found?.shifts ?? []).map((shift) => ({ ...shift })) };
  });
}
