import Link from "next/link";
import { SearchX, ShieldX } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

/** Forbidden (design.md §9): shown when the role lacks the permission. */
export function ForbiddenState({ homeHref = "/restaurant" }: { homeHref?: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-4">
      <IconTile icon={ShieldX} size="lg" tone="warning" />
      <h2 className="text-heading text-fg-primary">You don&apos;t have access</h2>
      <p className="text-body text-fg-secondary max-w-md">Your role doesn&apos;t include this area. Ask your restaurant administrator if you need it.</p>
      <Link href={homeHref} className="text-label text-fg-accent hover:underline">
        Go to your home page
      </Link>
    </div>
  );
}

/** Not found (design.md §9): identical for missing and other-tenant records (SC-TEN-04). */
export function NotFoundState({ backHref = "/restaurant", backLabel = "Go back" }: { backHref?: string; backLabel?: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-4">
      <IconTile icon={SearchX} size="lg" tone="neutral" />
      <h2 className="text-heading text-fg-primary">We couldn&apos;t find that</h2>
      <p className="text-body text-fg-secondary max-w-md">It doesn&apos;t exist or isn&apos;t part of your restaurant.</p>
      <Link href={backHref} className="text-label text-fg-accent hover:underline">
        {backLabel}
      </Link>
    </div>
  );
}
