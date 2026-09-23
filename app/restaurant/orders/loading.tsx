import { PageSkeleton } from "@/components/states/page-skeleton";

/** Matches the board layout so nothing jumps when the real cards arrive (frontend.md §4). */
export default function OrdersLoading() {
  return <PageSkeleton variant="cards" />;
}
