import { PageSkeleton } from "@/components/states/page-skeleton";

/** Column skeleton in the board's own shape, so nothing jumps when the tickets arrive (frontend.md §4). */
export default function KitchenLoading() {
  return <PageSkeleton variant="cards" />;
}
