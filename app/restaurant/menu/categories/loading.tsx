import { PageSkeleton } from "@/components/states/page-skeleton";

/** Loading state for `/restaurant/menu/categories` (frontend.md §4): the same row rhythm as the list it replaces. */
export default function Loading() {
  return <PageSkeleton variant="list" rows={5} />;
}
