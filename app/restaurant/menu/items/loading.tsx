import { PageSkeleton } from "@/components/states/page-skeleton";

/** Loading state for `/restaurant/menu/items` (frontend.md §4): the same row rhythm as the table it replaces. */
export default function Loading() {
  return <PageSkeleton variant="list" rows={8} />;
}
