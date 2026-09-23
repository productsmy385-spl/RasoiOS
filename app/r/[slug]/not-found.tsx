import { Store } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * Public 404 (ADR-012 §7). An unknown slug, a reserved host label, a suspended tenant and a website that has not been
 * published all render exactly this page, so nobody can tell from the response which of the four it was — a host can
 * never be used to enumerate restaurants.
 *
 * There is no tenant here, so there is no tenant theme to apply and no restaurant name to show; the page carries no
 * platform navigation either, because it is served from a restaurant's own address.
 */
export default function PublicRestaurantNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="flex max-w-prose flex-col items-center gap-4 text-center">
        <IconTile icon={Store} size="lg" tone="neutral" />
        <h1 className="text-display-m text-fg-primary">This restaurant website isn&apos;t available</h1>
        <p className="text-body text-fg-secondary">Check the address, or ask the restaurant for its current link.</p>
      </div>
    </main>
  );
}
