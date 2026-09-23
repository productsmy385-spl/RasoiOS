import type * as React from "react";

/** Column definition for <DataTable> (S1-P08-T007, design.md §8 Tables). */
export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** Rich cell content (status badge, link…). When absent, `text` is rendered. */
  cell?: (row: T) => React.ReactNode;
  /** Plain-text value: rendered when there is no `cell`, and used as the tooltip when the cell is truncated. */
  text?: (row: T) => string | null | undefined;
  align?: "start" | "center" | "end";
  /** Numbers and money: right-aligned with tabular numerals. */
  numeric?: boolean;
  /** Long text: one line with an ellipsis and the full text in `title`. */
  truncate?: boolean;
  sortable?: boolean;
  /** The card title below 768 px (defaults to the first column). */
  primary?: boolean;
  /** Leave out of the card layout (e.g. a detail already shown in the card title). */
  hideInCard?: boolean;
  className?: string;
};

export type SortDirection = "asc" | "desc";
export type SortState = { key: string; direction: SortDirection };
export type TableDensity = "comfortable" | "compact";
