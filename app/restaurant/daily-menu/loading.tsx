import { PageSkeleton } from "@/components/states/page-skeleton";

/** Loading state for `/restaurant/daily-menu` (frontend.md §4). */
export default function Loading() {
  return <PageSkeleton variant="detail" rows={6} />;
}
