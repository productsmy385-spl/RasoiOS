"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/toast";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import { setOrderCustomerAction } from "@/app/restaurant/orders/actions";

/**
 * Customer card on the order detail (SA-ORD-05). Lookup is the shared RH-CUS-01 endpoint — three characters minimum,
 * at most ten matches of the caller's own tenant, rate limited per user. Linking and unlinking are server actions;
 * nothing is shown as done before the server says so.
 */
export type LinkedCustomer = { id: string; fullName: string; phoneE164: string | null; email: string | null };

type Match = { id: string; fullName: string; phoneE164: string | null };

export function OrderCustomerPanel({
  orderId,
  customer,
  canEdit,
}: {
  orderId: string;
  customer: LinkedCustomer | null;
  /** The server's answer for this caller and order (`SET_CUSTOMER` in LD-ORD-02 `allowedActions`). */
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setMatches([]);
      setLookupError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/v1/customers/lookup?q=${encodeURIComponent(term)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("lookup failed");
        const body = (await response.json()) as { customers: Match[] };
        setMatches(body.customers);
        setLookupError(null);
      } catch (error) {
        if (!controller.signal.aborted) setLookupError("Customer search is unavailable right now.");
        void error;
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  async function link(customerId: string | null) {
    setPending(true);
    const result = await setOrderCustomerAction({ orderId, customerId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setQuery("");
    setMatches([]);
    toast.success(customerId ? "Customer linked to this order." : "Customer removed from this order.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {customer ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-subheading text-fg-primary">{customer.fullName}</p>
            {customer.phoneE164 && (
              <p className="flex items-center gap-1.5 text-caption text-numeric text-fg-secondary">
                <Icon icon={DOMAIN_ICONS.phone} size={16} />
                {customer.phoneE164}
              </p>
            )}
            {customer.email && (
              <p className="flex items-center gap-1.5 truncate text-caption text-fg-secondary">
                <Icon icon={DOMAIN_ICONS.email} size={16} />
                {customer.email}
              </p>
            )}
          </div>
          {canEdit && (
            <Button size="sm" variant="ghost" loading={pending} loadingLabel="Saving…" onClick={() => void link(null)}>
              Remove
            </Button>
          )}
        </div>
      ) : (
        <p className="text-body text-fg-secondary">No customer linked to this order.</p>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2">
          <SearchField
            label={customer ? "Link a different customer" : "Link a customer"}
            placeholder="Name, phone or email (3 characters)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            help={lookupError ?? (searching ? "Searching…" : undefined)}
          />
          {matches.length > 0 && (
            <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
              {matches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void link(match.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-fast ease-standard hover:bg-raised disabled:opacity-40"
                  >
                    <span className="min-w-0 truncate text-label text-fg-primary">{match.fullName}</span>
                    {match.phoneE164 && <span className="shrink-0 text-caption text-numeric text-fg-secondary">{match.phoneE164}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 3 && !searching && matches.length === 0 && !lookupError && (
            <p className="text-caption text-fg-secondary">No customer matches that.</p>
          )}
        </div>
      )}
    </div>
  );
}
