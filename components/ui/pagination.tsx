import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icon";

/**
 * Cursor pagination (S1-P08-T006, api.md §1: `{ items, nextCursor }`). Server-safe: builds plain links from the
 * current search params, so filters are kept and the list page stays a Server Component. Cursors are forward-only, so
 * the controls are "First page" and "Next page".
 */
export type PaginationProps = {
  /** The list page path, e.g. "/restaurant/transactions". */
  basePath: string;
  /** The page's current search params (as received by the page). */
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams;
  nextCursor: string | null | undefined;
  /** Name of the cursor param. Default "cursor". */
  param?: string;
  /** e.g. "Showing 25 transactions". */
  summary?: string;
  className?: string;
};

function toParams(input: PaginationProps["searchParams"]): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) for (const v of value) params.append(key, v);
  }
  return params;
}

export function paginationHref(basePath: string, searchParams: PaginationProps["searchParams"], cursor: string | null, param = "cursor"): string {
  const params = toParams(searchParams);
  if (cursor) params.set(param, cursor);
  else params.delete(param);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

const LINK = "inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong bg-raised px-4 text-label text-fg-primary transition-colors duration-fast ease-standard hover:bg-border-subtle";
const DISABLED = "inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle px-4 text-label text-fg-secondary opacity-40";

export function Pagination({ basePath, searchParams, nextCursor, param = "cursor", summary, className }: PaginationProps) {
  const current = toParams(searchParams).get(param);
  if (!current && !nextCursor) return summary ? <p className={cn("text-caption text-fg-secondary", className)}>{summary}</p> : null;

  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
      <p className="text-caption text-fg-secondary">{summary}</p>
      <div className="flex items-center gap-2">
        {current ? (
          <Link href={paginationHref(basePath, searchParams, null, param)} className={LINK}>
            <Icon icon={ChevronLeft} size={18} />
            First page
          </Link>
        ) : (
          <span aria-disabled="true" className={DISABLED}>
            <Icon icon={ChevronLeft} size={18} />
            First page
          </span>
        )}
        {nextCursor ? (
          <Link href={paginationHref(basePath, searchParams, nextCursor, param)} rel="next" className={LINK}>
            Next page
            <Icon icon={ChevronRight} size={18} />
          </Link>
        ) : (
          <span aria-disabled="true" className={DISABLED}>
            Next page
            <Icon icon={ChevronRight} size={18} />
          </span>
        )}
      </div>
    </nav>
  );
}
