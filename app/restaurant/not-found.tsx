import Link from "next/link";

// Not-found inside the restaurant console (S1-P04-T005): same message for missing and other-tenant records.
export default function RestaurantNotFound() {
  return (
    <div className="mx-auto max-w-auth space-y-4 py-16 text-center">
      <p className="text-label text-fg-accent">404</p>
      <h1 className="text-display-m text-fg-primary">Not found</h1>
      <p className="text-body text-fg-secondary">This record doesn&apos;t exist or isn&apos;t part of your restaurant.</p>
      {/* /restaurant is the role home redirect: the dashboard is not reachable by every role (frontend.md §3.3). */}
      <Link href="/restaurant" className="inline-flex h-11 items-center rounded-xl bg-action-primary px-4 text-label text-action-primary-fg hover:bg-action-primary-hover">
        Back to your home page
      </Link>
    </div>
  );
}
