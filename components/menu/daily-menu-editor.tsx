"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DailyMenuStatus } from "@prisma/client";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Globe, Plus, Save, Search, Trash2, X } from "lucide-react";
import {
  copyDailyMenuAction,
  deleteDraftDailyMenuAction,
  publishDailyMenuAction,
  saveDailyMenuDraftAction,
  unpublishDailyMenuAction,
} from "@/app/restaurant/menu/daily-actions";
import { EmptyState } from "@/components/states/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Select, TextArea, TextField } from "@/components/ui/inputs";
import { SortableList } from "@/components/ui/sortable-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import type { DailyMenuDto, DailyMenuSummaryDto, PickableItemDto } from "@/lib/data/daily-menu";
import { cn } from "@/lib/ui/cn";
import { formatBusinessDate, formatInZone, formatMoney } from "@/lib/ui/format";
import { addDays, daysBetween, relativeDayName, stripLabel } from "./business-date";
import { DietaryMark } from "./dietary-mark";
import { failureText, UNREACHABLE, type ActionFailure } from "./feedback";

/**
 * Daily menu editor (S1-P11-T003; frontend.md §5.3 `/restaurant/daily-menu`).
 *
 * The business date lives in the URL and "today" comes from the server in the restaurant's timezone, so a manager in
 * Bengaluru and one in New York each see their own day. Everything the screen shows is LD-DMENU-01/02 data; every
 * change is SA-DMENU-01…05, and nothing is reported as published until `publishDailyMenuAction` returns `ok`.
 *
 * Publishing saves first: the item list on screen is what gets published, so "Publish" is save-draft followed by
 * publish, and a refusal (422 DAILY_MENU_EMPTY, 422 ITEM_NOT_PUBLISHED) is shown with the server's own words.
 */
export type DailyMenuEditorProps = {
  businessDate: string;
  /** Today in the restaurant's timezone, decided by the server. */
  today: string;
  dailyMenu: DailyMenuDto | null;
  pickableItems: readonly PickableItemDto[];
  previousMenus: readonly DailyMenuSummaryDto[];
  calendar: readonly DailyMenuSummaryDto[];
  canManage: boolean;
  currencyCode: string;
  timezone: string;
};

type SelectedItem = {
  id: string;
  name: string;
  categoryName: string | null;
  basePrice: string | null;
  isPublished: boolean;
  isAvailable: boolean;
  isArchived: boolean;
};

const STRIP_DAYS = 14;

export function DailyMenuEditor({
  businessDate,
  today,
  dailyMenu,
  pickableItems,
  previousMenus,
  calendar,
  canManage,
  currencyCode,
  timezone,
}: DailyMenuEditorProps) {
  const router = useRouter();
  const toast = useToast();

  const byId = React.useMemo(() => new Map(pickableItems.map((item) => [item.id, item])), [pickableItems]);
  const describe = React.useCallback(
    (id: string, fallbackName: string, flags?: { isPublished: boolean; isAvailable: boolean; isArchived: boolean }): SelectedItem => {
      const item = byId.get(id);
      if (item) return { id, name: item.name, categoryName: item.categoryName, basePrice: item.basePrice, isPublished: item.isPublished, isAvailable: item.isAvailable, isArchived: false };
      return { id, name: fallbackName, categoryName: null, basePrice: null, isPublished: flags?.isPublished ?? false, isAvailable: flags?.isAvailable ?? false, isArchived: flags?.isArchived ?? true };
    },
    [byId],
  );

  const serverSelection = React.useMemo(
    () => (dailyMenu?.items ?? []).map((item) => describe(item.menuItemId, item.name, item)),
    [dailyMenu, describe],
  );

  const [selected, setSelected] = React.useState<SelectedItem[]>(serverSelection);
  const [title, setTitle] = React.useState(dailyMenu?.title ?? "");
  const [note, setNote] = React.useState(dailyMenu?.note ?? "");
  const [pending, setPending] = React.useState<null | "save" | "publish" | "unpublish" | "delete" | "copy">(null);
  const [problem, setProblem] = React.useState<{ title: string; message: string } | null>(null);
  const [skipped, setSkipped] = React.useState<Array<{ menuItemId: string; name: string; reason: string }>>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // The server list is the truth; reset whenever a new date (or a saved menu) arrives.
  const signature = `${businessDate}:${dailyMenu?.id ?? "none"}:${dailyMenu?.updatedAt ?? ""}`;
  const lastSignature = React.useRef(signature);
  React.useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    setSelected(serverSelection);
    setTitle(dailyMenu?.title ?? "");
    setNote(dailyMenu?.note ?? "");
    setProblem(null);
  }, [signature, serverSelection, dailyMenu]);

  const isPast = daysBetween(today, businessDate) < 0;
  const editable = canManage && !isPast;
  const status: DailyMenuStatus | null = dailyMenu?.status ?? null;
  const dirty =
    JSON.stringify(selected.map((item) => item.id)) !== JSON.stringify(serverSelection.map((item) => item.id)) ||
    title !== (dailyMenu?.title ?? "") ||
    note !== (dailyMenu?.note ?? "");

  function fail(heading: string, result: ActionFailure) {
    setProblem({ title: heading, message: failureText(result) });
    toast.error(failureText(result));
  }

  async function saveDraft(): Promise<string | null> {
    const result = await saveDailyMenuDraftAction({ businessDate, title, note, itemIds: selected.map((item) => item.id) });
    if (!result.ok) {
      fail("This menu could not be saved", result);
      return null;
    }
    return result.data.dailyMenuId;
  }

  async function onSave() {
    setPending("save");
    setProblem(null);
    try {
      const id = await saveDraft();
      if (id) {
        toast.success(`Draft saved for ${formatBusinessDate(businessDate)}.`);
        router.refresh();
      }
    } catch {
      toast.error(UNREACHABLE);
    } finally {
      setPending(null);
    }
  }

  async function onPublish() {
    setPending("publish");
    setProblem(null);
    try {
      // Publish what is on screen: save first, then publish the menu the server just wrote.
      const id = await saveDraft();
      if (!id) return;
      const result = await publishDailyMenuAction({ dailyMenuId: id });
      if (!result.ok) {
        fail("This menu could not be published", result);
        return;
      }
      toast.success(`Published — guests see it on ${formatBusinessDate(businessDate)}.`);
      router.refresh();
    } catch {
      toast.error(UNREACHABLE);
    } finally {
      setPending(null);
    }
  }

  async function onUnpublish() {
    if (!dailyMenu) return;
    setPending("unpublish");
    setProblem(null);
    try {
      const result = await unpublishDailyMenuAction({ dailyMenuId: dailyMenu.id });
      if (!result.ok) {
        fail("This menu could not be hidden", result);
        return;
      }
      toast.success("Hidden from your website.");
      router.refresh();
    } catch {
      toast.error(UNREACHABLE);
    } finally {
      setPending(null);
    }
  }

  async function onDelete() {
    if (!dailyMenu) return;
    setPending("delete");
    try {
      const result = await deleteDraftDailyMenuAction({ dailyMenuId: dailyMenu.id });
      if (!result.ok) {
        fail("This draft could not be deleted", result);
        return;
      }
      setDeleteOpen(false);
      toast.success("Draft deleted.");
      router.refresh();
    } catch {
      toast.error(UNREACHABLE);
    } finally {
      setPending(null);
    }
  }

  async function onCopy(fromBusinessDate: string) {
    setPending("copy");
    setProblem(null);
    setSkipped([]);
    try {
      const result = await copyDailyMenuAction({ fromBusinessDate, toBusinessDate: businessDate });
      if (!result.ok) {
        fail("That menu could not be copied", result);
        return;
      }
      setCopyOpen(false);
      setSkipped(result.data.skipped);
      toast.success(`Copied ${result.data.copiedCount} ${result.data.copiedCount === 1 ? "item" : "items"} from ${formatBusinessDate(fromBusinessDate)}.`);
      router.refresh();
    } catch {
      toast.error(UNREACHABLE);
    } finally {
      setPending(null);
    }
  }

  const chosen = new Set(selected.map((item) => item.id));
  const query = search.trim().toLowerCase();
  const available = pickableItems.filter((item) => !chosen.has(item.id) && (query === "" || item.name.toLowerCase().includes(query) || item.categoryName.toLowerCase().includes(query)));
  const unpublishedChosen = selected.filter((item) => !item.isPublished || item.isArchived);

  const picker = (
    <ItemPicker
      items={available}
      search={search}
      onSearch={setSearch}
      currencyCode={currencyCode}
      disabled={!editable}
      totalPickable={pickableItems.length}
      onAdd={(item) => setSelected((current) => [...current, describe(item.id, item.name)])}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <DateNavigator businessDate={businessDate} today={today} />
      <StatusStrip businessDate={businessDate} today={today} calendar={calendar} />

      {isPast && (
        <Alert tone="neutral" title="This day has passed">
          Menus for past dates are history and cannot be changed. Pick today or a later date to make changes.
        </Alert>
      )}
      {!canManage && (
        <Alert tone="neutral" title="Read-only">
          Your role can see the daily menu but not change it.
        </Alert>
      )}
      {problem && (
        <Alert tone="danger" title={problem.title}>
          {problem.message}
        </Alert>
      )}
      {skipped.length > 0 && (
        <Alert tone="warning" title={`${skipped.length} ${skipped.length === 1 ? "item was" : "items were"} left out of the copy`}>
          <ul className="list-inside list-disc">
            {skipped.map((item) => (
              <li key={item.menuItemId}>{`${item.name} — ${item.reason === "ARCHIVED" ? "archived" : "not published"}`}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader
              action={
                status ? <StatusBadge domain="dailyMenu" status={status} /> : <Badge tone="neutral">Not created</Badge>
              }
            >
              <CardTitle>{`Menu for ${formatBusinessDate(businessDate)}`}</CardTitle>
              <CardDescription>
                {status === "PUBLISHED" && dailyMenu?.publishedAt
                  ? `Published ${formatInZone(dailyMenu.publishedAt, timezone, "datetime")}`
                  : "Pick the dishes guests should see on this date, in the order they should read."}
              </CardDescription>
            </CardHeader>

            <div className="flex flex-col gap-4">
              <TextField label="Title" maxLength={80} placeholder="Today's specials" value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} />
              <TextArea label="Note" rows={2} maxLength={280} showCount value={note} disabled={!editable} onChange={(event) => setNote(event.target.value)} help="Shown under the title on your website." />
            </div>
          </Card>

          <Card>
            <CardHeader
              action={
                editable ? (
                  <Button variant="secondary" icon={Plus} className="lg:hidden" onClick={() => setPickerOpen(true)}>
                    Add items
                  </Button>
                ) : undefined
              }
            >
              <CardTitle>{`Selected items (${selected.length})`}</CardTitle>
              <CardDescription>The order here is the order on your website.</CardDescription>
            </CardHeader>

            {unpublishedChosen.length > 0 && (
              <Alert tone="warning" title="Some of these cannot be published" className="mb-4">
                {`Publish or remove them first: ${unpublishedChosen.map((item) => item.name).join(", ")}.`}
              </Alert>
            )}

            {selected.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={`No daily menu for ${formatBusinessDate(businessDate)}`}
                description={editable ? "Add items from your menu, or copy a previous day to start from what you served then." : "Nothing has been curated for this date."}
              />
            ) : editable ? (
              <SortableList
                items={selected}
                label="Selected daily menu items"
                getKey={(item) => item.id}
                getLabel={(item) => item.name}
                onReorder={setSelected}
                renderItem={(item) => (
                  <SelectedRow
                    item={item}
                    currencyCode={currencyCode}
                    onRemove={() => setSelected((current) => current.filter((row) => row.id !== item.id))}
                  />
                )}
              />
            ) : (
              <ol className="flex flex-col gap-2">
                {selected.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border-subtle bg-card px-4 py-3">
                    <SelectedRow item={item} currencyCode={currencyCode} />
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {canManage && (
            <div className="sticky bottom-4 flex flex-col gap-2 rounded-2xl border border-border-subtle bg-card p-4 shadow-e2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <p aria-live="polite" className="mr-auto text-caption text-fg-secondary">
                {pending ? "Working…" : dirty ? "Unsaved changes" : status ? `Saved · ${status === "PUBLISHED" ? "published" : "not published"}` : ""}
              </p>
              <Button variant="secondary" icon={Copy} disabled={!editable || pending !== null || previousMenus.length === 0} onClick={() => setCopyOpen(true)}>
                Copy from…
              </Button>
              {dailyMenu && status === "DRAFT" && (
                <Button variant="ghost" icon={Trash2} disabled={!editable || pending !== null} onClick={() => setDeleteOpen(true)}>
                  Delete draft
                </Button>
              )}
              {status === "PUBLISHED" ? (
                <Button variant="secondary" loading={pending === "unpublish"} disabled={!editable || pending !== null} onClick={() => void onUnpublish()}>
                  Unpublish
                </Button>
              ) : null}
              <Button variant="secondary" icon={Save} loading={pending === "save"} disabled={!editable || pending !== null} onClick={() => void onSave()}>
                Save draft
              </Button>
              <Button icon={Globe} loading={pending === "publish"} disabled={!editable || pending !== null || selected.length === 0} onClick={() => void onPublish()}>
                {status === "PUBLISHED" ? "Save and republish" : "Publish"}
              </Button>
            </div>
          )}
        </div>

        <div className="hidden min-w-0 lg:col-span-1 lg:block">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Add from your menu</CardTitle>
              <CardDescription>Only items that are not already on this menu appear here.</CardDescription>
            </CardHeader>
            {picker}
          </Card>
        </div>
      </div>

      <Drawer open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add from your menu" side="bottom">
        {picker}
      </Drawer>

      <CopyMenuDialog open={copyOpen} onClose={() => setCopyOpen(false)} previousMenus={previousMenus} pending={pending === "copy"} onCopy={(from) => void onCopy(from)} timezone={timezone} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete the draft for ${formatBusinessDate(businessDate)}?`}
        description="The draft and its item list are removed. Your menu items are not affected."
        confirmLabel="Delete draft"
        tone="destructive"
        pending={pending === "delete"}
        onConfirm={onDelete}
      />
    </div>
  );
}

function SelectedRow({ item, currencyCode, onRemove }: { item: SelectedItem; currencyCode: string; onRemove?: () => void }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-subheading text-fg-primary" title={item.name}>
          {item.name}
        </p>
        <p className="truncate text-caption text-fg-secondary">{item.categoryName ?? "No longer on your menu"}</p>
      </div>
      {item.basePrice && <span className="shrink-0 text-body tabular-nums text-fg-secondary">{formatMoney(item.basePrice, currencyCode)}</span>}
      {item.isArchived ? <Badge tone="danger">Archived</Badge> : !item.isPublished ? <Badge tone="warning">Not published</Badge> : !item.isAvailable ? <Badge tone="warning">Sold out</Badge> : null}
      {onRemove && <IconButton icon={X} size="sm" aria-label={`Remove ${item.name} from this menu`} onClick={onRemove} />}
    </div>
  );
}

function ItemPicker({
  items,
  search,
  onSearch,
  onAdd,
  currencyCode,
  disabled,
  totalPickable,
}: {
  items: readonly PickableItemDto[];
  search: string;
  onSearch: (value: string) => void;
  onAdd: (item: PickableItemDto) => void;
  currencyCode: string;
  disabled: boolean;
  totalPickable: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TextField label="Search your menu" type="search" value={search} placeholder="Paneer" autoComplete="off" onChange={(event) => onSearch(event.target.value)} />
      {totalPickable === 0 ? (
        <EmptyState
          icon={Search}
          title="No menu items yet"
          description="Create and publish menu items first; a daily menu can only contain items that already exist."
          action={{ href: "/restaurant/menu/items", label: "Go to menu items" }}
        />
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-body text-fg-secondary">{search.trim() ? "No items match that search." : "Everything on your menu is already on this daily menu."}</p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd(item)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-card px-3 py-2 text-left",
                  "transition-colors duration-fast ease-standard hover:border-border-strong hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <Icon icon={Plus} size={16} className="shrink-0 text-fg-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-fg-primary">{item.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="truncate text-caption text-fg-secondary">{item.categoryName}</span>
                    <DietaryMark dietaryType={item.dietaryType} showLabel={false} />
                    {!item.isPublished && <Badge tone="warning">Not published</Badge>}
                  </span>
                </span>
                <span className="shrink-0 text-body tabular-nums text-fg-secondary">{formatMoney(item.basePrice, currencyCode)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DateNavigator({ businessDate, today }: { businessDate: string; today: string }) {
  const router = useRouter();
  const relative = relativeDayName(businessDate, today);
  const href = (date: string) => `/restaurant/daily-menu?date=${date}`;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1">
        <Link href={href(addDays(businessDate, -1))} aria-label="Previous day" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-fg-primary hover:bg-raised">
          <Icon icon={ChevronLeft} size={20} />
        </Link>
        <Link href={href(addDays(businessDate, 1))} aria-label="Next day" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-fg-primary hover:bg-raised">
          <Icon icon={ChevronRight} size={20} />
        </Link>
      </div>
      <TextField
        label="Business date"
        type="date"
        value={businessDate}
        className="w-44"
        onChange={(event) => {
          if (event.target.value) router.push(href(event.target.value));
        }}
      />
      <div className="flex items-center gap-2 pb-1">
        <Link
          href={href(today)}
          aria-current={businessDate === today ? "page" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-xl border border-border-strong px-4 text-label transition-colors duration-fast ease-standard",
            businessDate === today ? "bg-action-primary/12 text-fg-primary" : "bg-raised text-fg-primary hover:bg-border-subtle",
          )}
        >
          Today
        </Link>
        {relative && relative !== "Today" && <span className="text-caption text-fg-secondary">{relative}</span>}
      </div>
    </div>
  );
}

function StatusStrip({ businessDate, today, calendar }: { businessDate: string; today: string; calendar: readonly DailyMenuSummaryDto[] }) {
  const start = daysBetween(today, businessDate) < 0 ? businessDate : today;
  const byDate = new Map(calendar.map((entry) => [entry.businessDate, entry]));
  const days = Array.from({ length: STRIP_DAYS }, (_, index) => addDays(start, index));

  return (
    <nav aria-label="Next fortnight" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {days.map((date) => {
        const entry = byDate.get(date);
        const label = stripLabel(date);
        const active = date === businessDate;
        return (
          <Link
            key={date}
            href={`/restaurant/daily-menu?date=${date}`}
            aria-current={active ? "page" : undefined}
            aria-label={`${formatBusinessDate(date)} — ${entry ? `${entry.status.toLowerCase()}, ${entry.itemCount} items` : "no menu"}`}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-colors duration-fast ease-standard",
              active ? "border-action-primary bg-action-primary/12" : "border-border-subtle bg-card hover:border-border-strong",
            )}
          >
            <span aria-hidden="true" className="text-caption text-fg-secondary">
              {label.weekday}
            </span>
            <span aria-hidden="true" className="text-subheading tabular-nums text-fg-primary">
              {label.day}
            </span>
            <span aria-hidden="true" className="text-caption text-fg-secondary">
              {entry ? (entry.status === "PUBLISHED" ? "Live" : entry.status === "DRAFT" ? "Draft" : "Hidden") : "—"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function CopyMenuDialog({
  open,
  onClose,
  previousMenus,
  pending,
  onCopy,
  timezone,
}: {
  open: boolean;
  onClose: () => void;
  previousMenus: readonly DailyMenuSummaryDto[];
  pending: boolean;
  onCopy: (fromBusinessDate: string) => void;
  timezone: string;
}) {
  const [from, setFrom] = React.useState(previousMenus[0]?.businessDate ?? "");
  React.useEffect(() => {
    if (open) setFrom(previousMenus[0]?.businessDate ?? "");
  }, [open, previousMenus]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Copy a previous menu"
      description={`Items that have since been archived or unpublished are left out, and named afterwards. Dates are ${timezone} business dates.`}
      size="confirm"
      guardDirty={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button loading={pending} disabled={from === ""} onClick={() => onCopy(from)}>
            Copy items
          </Button>
        </>
      }
    >
      {previousMenus.length === 0 ? (
        <p className="text-body text-fg-secondary">There is no earlier menu to copy from yet.</p>
      ) : (
        <Select
          label="Copy from"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          options={previousMenus.map((menu) => ({
            value: menu.businessDate,
            label: `${formatBusinessDate(menu.businessDate)} — ${menu.itemCount} ${menu.itemCount === 1 ? "item" : "items"}`,
          }))}
        />
      )}
    </Dialog>
  );
}
