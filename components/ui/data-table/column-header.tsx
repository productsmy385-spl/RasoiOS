import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "../icon";
import type { SortDirection, SortState } from "./types";

/**
 * Sortable column header control (S1-P08-T007). Server pages pass `href` (the sort lives in the URL, e.g.
 * `?sort=amount&dir=desc`); client tables pass `onSort`. The <th> carries `aria-sort`; the control says what
 * activating it will do.
 */
export function nextDirection(sort: SortState | null | undefined, key: string): SortDirection {
  return sort?.key === key && sort.direction === "asc" ? "desc" : "asc";
}

export function ariaSort(sort: SortState | null | undefined, key: string): "ascending" | "descending" | undefined {
  if (sort?.key !== key) return undefined;
  return sort.direction === "asc" ? "ascending" : "descending";
}

export function ColumnHeader({
  label,
  columnKey,
  sort,
  href,
  onSort,
  alignEnd,
}: {
  label: string;
  columnKey: string;
  sort: SortState | null | undefined;
  href?: string;
  onSort?: () => void;
  alignEnd?: boolean;
}) {
  const active = sort?.key === columnKey;
  const icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  const hint = `, sort ${nextDirection(sort, columnKey) === "asc" ? "ascending" : "descending"}`;
  const className = cn(
    "inline-flex items-center gap-1.5 rounded-md hover:text-fg-primary",
    alignEnd && "flex-row-reverse",
    active ? "text-fg-primary" : "text-fg-secondary",
  );
  const content = (
    <>
      <span>{label}</span>
      <span className="sr-only">{hint}</span>
      <Icon icon={icon} size={16} />
    </>
  );
  if (href) {
    return (
      <Link href={href} scroll={false} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onSort} className={className}>
      {content}
    </button>
  );
}
