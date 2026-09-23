"use client";

import { useState, useTransition } from "react";
import { switchActiveTenantAction } from "./actions";

type Item = { membershipId: string; tenantName: string; role: string; current: boolean };

export function SelectTenantList({ memberships }: { memberships: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (memberships.length === 0) return <p>None of your restaurants is active right now.</p>;

  return (
    <div className="space-y-2 text-left">
      {memberships.map((m) => (
        <button
          key={m.membershipId}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await switchActiveTenantAction({ membershipId: m.membershipId });
              if (result && !result.ok) setError(result.error.message);
            })
          }
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border-strong hover:border-action-primary bg-raised text-fg-primary disabled:opacity-60"
        >
          <span className="font-semibold">{m.tenantName}</span>
          <span className="text-xs text-fg-secondary">
            {m.role.replace("_", " ").toLowerCase()}
            {m.current ? " · current" : ""}
          </span>
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-status-danger">
          {error}
        </p>
      )}
    </div>
  );
}
