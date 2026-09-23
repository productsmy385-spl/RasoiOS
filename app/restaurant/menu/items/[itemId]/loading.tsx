import { PageSkeleton } from "@/components/states/page-skeleton";

/** Loading state for the menu item editor (frontend.md §4). */
export default function Loading() {
  return <PageSkeleton variant="detail" rows={8} />;
}
