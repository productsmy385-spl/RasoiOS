"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutList, Pencil, Plus, Archive } from "lucide-react";
import {
  archiveCategoryAction,
  reorderCategoriesAction,
  setCategoryPublishedAction,
} from "@/app/restaurant/menu/categories-actions";
import { EmptyState } from "@/components/states/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { RowActions } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/inputs";
import { SortableList } from "@/components/ui/sortable-list";
import { useToast } from "@/components/ui/toast";
import type { MenuCategoryDto } from "@/lib/data/menu";
import { cn } from "@/lib/ui/cn";
import { CategoryFormDialog } from "./category-form-dialog";
import { failureText, UNREACHABLE, type ActionFailure } from "./feedback";
import { MenuIconTile } from "./menu-image";

/**
 * Categories screen (S1-P10-T005; frontend.md §5.3 `/restaurant/menu/categories`). Real data only: the list arrives
 * from LD-MENU-01 on the server and every change goes through SA-MENU-01…05. A change is shown only after the server
 * confirms it — the publish switch and the reorder roll back when the action fails, and the page is refreshed so the
 * item counts and order come back from the database rather than from guesswork.
 *
 * `canManage` reflects `menu:manage` (SC-RBAC-08): it hides controls a CASHIER, WAITER or KITCHEN user cannot use.
 * It is not the authorisation — every action re-checks on the server.
 */
export type CategoriesBoardProps = {
  categories: readonly MenuCategoryDto[];
  canManage: boolean;
  /** The archived list is read-only history: no reordering, no publishing. */
  archived: boolean;
};

/** Hides a switch's text label without losing it for screen readers ("Published: Starters"). */
const SWITCH_LABEL_SR_ONLY = "[&>label>span:first-child]:sr-only";

export function CategoriesBoard({ categories, canManage, archived }: CategoriesBoardProps) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = React.useState<MenuCategoryDto[]>([...categories]);
  const [editing, setEditing] = React.useState<MenuCategoryDto | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [archiving, setArchiving] = React.useState<MenuCategoryDto | null>(null);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // The server list is the truth; local state only carries an in-flight reorder.
  React.useEffect(() => setOrder([...categories]), [categories]);

  function report(result: ActionFailure) {
    toast.error(failureText(result));
  }

  async function persistOrder(next: MenuCategoryDto[]) {
    const previous = order;
    setOrder(next);
    setBusy(true);
    try {
      const result = await reorderCategoriesAction({ orderedIds: next.map((category) => category.id) });
      if (!result.ok) {
        setOrder(previous);
        report(result);
        return;
      }
      setOrder(result.data.items);
      toast.success("Category order saved.");
      router.refresh();
    } catch {
      setOrder(previous);
      toast.error(UNREACHABLE);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(category: MenuCategoryDto, published: boolean) {
    const previous = order;
    setOrder((current) => current.map((row) => (row.id === category.id ? { ...row, isPublished: published } : row)));
    try {
      const result = await setCategoryPublishedAction({ categoryId: category.id, published });
      if (!result.ok) {
        setOrder(previous);
        report(result);
        return;
      }
      toast.success(published ? `${category.name} is visible on your website.` : `${category.name} is hidden from your website.`);
      router.refresh();
    } catch {
      setOrder(previous);
      toast.error(UNREACHABLE);
    }
  }

  async function confirmArchive() {
    if (!archiving) return;
    setArchiveError(null);
    try {
      const result = await archiveCategoryAction({ categoryId: archiving.id });
      if (!result.ok) {
        setArchiveError(failureText(result));
        return;
      }
      toast.success(`${archiving.name} archived.`);
      setArchiving(null);
      router.refresh();
    } catch {
      setArchiveError(UNREACHABLE);
    }
  }

  const addButton = canManage && !archived && (
    <Button
      icon={Plus}
      onClick={() => {
        setEditing(null);
        setFormOpen(true);
      }}
    >
      Add category
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Category list">
          <ViewLink href="/restaurant/menu/categories" active={!archived} label="Active" />
          <ViewLink href="/restaurant/menu/categories?archived=true" active={archived} label="Archived" />
        </div>
        {addButton}
      </div>

      {order.length === 0 ? (
        <Card>
          <EmptyState
            icon={LayoutList}
            title={archived ? "No archived categories" : "No categories yet"}
            description={
              archived
                ? "Categories you archive are kept here so past orders still read correctly."
                : "Categories group your dishes on the menu and on your public website. Start with one such as Starters."
            }
          />
          {canManage && !archived && <div className="flex justify-center pb-6">{addButton}</div>}
        </Card>
      ) : canManage && !archived ? (
        <SortableList
          items={order}
          label="Menu categories"
          disabled={busy}
          getKey={(category) => category.id}
          getLabel={(category) => category.name}
          onReorder={(next) => void persistOrder(next)}
          renderItem={(category) => (
            <CategoryRow
              category={category}
              canManage
              archived={false}
              onEdit={() => {
                setEditing(category);
                setFormOpen(true);
              }}
              onArchive={() => {
                setArchiveError(null);
                setArchiving(category);
              }}
              onTogglePublished={(published) => void togglePublished(category, published)}
            />
          )}
        />
      ) : (
        <ul aria-label={archived ? "Archived categories" : "Menu categories"} className="flex flex-col gap-2">
          {order.map((category) => (
            <li key={category.id} className="rounded-xl border border-border-subtle bg-card px-4 py-3">
              <CategoryRow category={category} canManage={false} archived={archived} />
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={formOpen}
        category={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(saved, mode) => {
          toast.success(mode === "created" ? `${saved.name} added.` : `${saved.name} saved.`);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={archiving !== null}
        onClose={() => setArchiving(null)}
        title={archiving ? `Archive "${archiving.name}"?` : "Archive category?"}
        description="Archiving hides the category from your website and from new orders. Past orders keep their own copy of every name and price."
        confirmLabel="Archive category"
        tone="destructive"
        onConfirm={confirmArchive}
      >
        {archiveError && (
          <Alert tone="danger" title="This category can't be archived yet">
            {archiveError}
          </Alert>
        )}
      </ConfirmDialog>
    </div>
  );
}

function ViewLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center rounded-xl px-3 text-label transition-colors duration-fast ease-standard",
        active ? "bg-action-primary/12 text-fg-primary" : "text-fg-secondary hover:bg-raised hover:text-fg-primary",
      )}
    >
      {label}
    </Link>
  );
}

function CategoryRow({
  category,
  canManage,
  archived,
  onEdit,
  onArchive,
  onTogglePublished,
}: {
  category: MenuCategoryDto;
  canManage: boolean;
  archived: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onTogglePublished?: (published: boolean) => void;
}) {
  const itemCount = `${category.itemCount} ${category.itemCount === 1 ? "item" : "items"}`;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <MenuIconTile iconKey={category.iconKey} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-subheading text-fg-primary" title={category.name}>
          {category.name}
        </p>
        {category.description && (
          <p className="truncate text-caption text-fg-secondary" title={category.description}>
            {category.description}
          </p>
        )}
      </div>
      <Badge tone="neutral">{itemCount}</Badge>
      {archived ? (
        <Badge tone="neutral" icon={Archive}>
          Archived
        </Badge>
      ) : canManage && onTogglePublished ? (
        <Switch
          label={`Published: ${category.name}`}
          checked={category.isPublished}
          onChange={(event) => onTogglePublished(event.target.checked)}
          className={SWITCH_LABEL_SR_ONLY}
        />
      ) : (
        <Badge tone={category.isPublished ? "success" : "neutral"}>{category.isPublished ? "Published" : "Hidden"}</Badge>
      )}
      {canManage && onEdit && onArchive && (
        <RowActions
          label={`Actions for ${category.name}`}
          items={[
            { label: "Edit category", icon: Pencil, onSelect: onEdit },
            { label: "Archive category", icon: Archive, tone: "danger", onSelect: onArchive },
          ]}
        />
      )}
    </div>
  );
}
