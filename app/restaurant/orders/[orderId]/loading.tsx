import { PageSkeleton } from "@/components/states/page-skeleton";

/** Detail skeleton in the shape of the real page (frontend.md §4). */
export default function OrderDetailLoading() {
  return <PageSkeleton variant="detail" rows={8} />;
}
