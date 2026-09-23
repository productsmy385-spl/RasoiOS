import * as React from "react";
import { cn } from "@/lib/ui/cn";
import { ariaSort, ColumnHeader, nextDirection } from "./column-header";
import type { DataTableColumn, SortDirection, SortState, TableDensity } from "./types";

/**
 * DataTable (S1-P08-T007, design.md §8 Tables, §6): the one table for list pages.
 * - ≥ 768 px: a table with a raised, sticky header row; text left-aligned, numbers and money right-aligned with tabular
 *   numerals; long text truncated with the full value in `title`; `aria-sort` on sortable headers; row actions last.
 *   Only the table scrolls horizontally inside its own container — never the page.
 * - < 768 px: the same rows as stacked cards that keep every label/value pair.
 * Server-safe (no hooks): use it from Server Components with `sortHref`, or from client components with `onSortChange`.
 */
export type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  /** Accessible name of the table (visually hidden unless `showCaption`). */
  caption: string;
  showCaption?: boolean;
  /** Shown instead of the table when there are no rows — use a specific <EmptyState>. */
  empty: React.ReactNode;
  density?: TableDensity;
  sort?: SortState | null;
  /** URL for sorting by `key` in `direction` (server-driven sorting). */
  sortHref?: (key: string, direction: SortDirection) => string;
  /** Client-side sorting callback (used when `sortHref` is not given). */
  onSortChange?: (sort: SortState) => void;
  /** Actions for a row, typically <RowActions>. */
  rowActions?: (row: T) => React.ReactNode;
  className?: string;
};

const ALIGN = { start: "text-left", center: "text-center", end: "text-right" } as const;

function alignment<T>(column: DataTableColumn<T>): keyof typeof ALIGN {
  return column.align ?? (column.numeric ? "end" : "start");
}

function renderCell<T>(column: DataTableColumn<T>, row: T): React.ReactNode {
  const content = column.cell ? column.cell(row) : (column.text?.(row) ?? "");
  if (!column.truncate) return content;
  const title = column.text?.(row) ?? (typeof content === "string" ? content : undefined);
  return (
    <span className="block max-w-xs truncate" title={title ?? undefined}>
      {content}
    </span>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  showCaption = false,
  empty,
  density = "comfortable",
  sort,
  sortHref,
  onSortChange,
  rowActions,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <section aria-label={caption} className={cn("rounded-2xl border border-border-subtle bg-card shadow-e1", className)}>
        {showCaption && <h2 className="px-5 pt-5 text-subheading text-fg-primary">{caption}</h2>}
        {empty}
      </section>
    );
  }

  const primary = columns.find((column) => column.primary) ?? columns[0];
  const cardColumns = columns.filter((column) => column !== primary && !column.hideInCard);
  const rowHeight = density === "compact" ? "h-10" : "h-12";

  return (
    <div className={cn("flex flex-col gap-3", className)} data-density={density}>
      {showCaption && <h2 className="text-subheading text-fg-primary">{caption}</h2>}

      {/* Table: 768 px and up. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border-subtle bg-card shadow-e1 md:block" data-table-mode="table">
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const align = alignment(column);
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.sortable ? ariaSort(sort, column.key) : undefined}
                    className={cn("sticky top-0 z-10 h-10 whitespace-nowrap bg-raised px-4 text-label text-fg-secondary", ALIGN[align])}
                  >
                    {column.sortable && (sortHref || onSortChange) ? (
                      <ColumnHeader
                        label={column.header}
                        columnKey={column.key}
                        sort={sort}
                        alignEnd={align === "end"}
                        href={sortHref?.(column.key, nextDirection(sort, column.key))}
                        onSort={onSortChange ? () => onSortChange({ key: column.key, direction: nextDirection(sort, column.key) }) : undefined}
                      />
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th scope="col" className="sticky top-0 z-10 h-10 w-12 bg-raised px-4 text-right text-label text-fg-secondary">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-t border-border-subtle transition-colors duration-fast ease-standard hover:bg-raised">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(rowHeight, "px-4 py-2 align-middle text-fg-primary", ALIGN[alignment(column)], column.numeric && "tabular-nums whitespace-nowrap", column.className)}
                  >
                    {renderCell(column, row)}
                  </td>
                ))}
                {rowActions && <td className={cn(rowHeight, "px-2 py-1 text-right align-middle")}>{rowActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards: below 768 px. Every label/value pair is kept. */}
      <ul aria-label={caption} className="flex flex-col gap-3 md:hidden" data-table-mode="cards">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="min-w-0 rounded-2xl border border-border-subtle bg-card p-4 shadow-e1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 break-words text-subheading text-fg-primary">{primary.cell ? primary.cell(row) : primary.text?.(row)}</div>
              {rowActions && <div className="-mr-2 -mt-2 shrink-0">{rowActions(row)}</div>}
            </div>
            {cardColumns.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {cardColumns.map((column) => (
                  <React.Fragment key={column.key}>
                    <dt className="text-caption text-fg-secondary">{column.header}</dt>
                    <dd className={cn("min-w-0 break-words text-body text-fg-primary", column.numeric ? "text-right tabular-nums" : "text-left")}>{renderCell(column, row)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
