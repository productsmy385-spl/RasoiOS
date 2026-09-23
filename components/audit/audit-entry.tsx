import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { DOMAIN_HUES, DOMAIN_ICONS } from "@/lib/ui/icons";
import type { AuditEntryDto } from "@/lib/data/audit";

/**
 * One audit entry (S1-P23-T002, api.md LD-AUD-01). `before`/`after` are already redacted when the row is written
 * (lib/audit/redact.ts), so this only decides what is worth showing: the fields that actually changed, with added,
 * removed and changed marked in words as well as colour (design.md §7 — never colour alone).
 */
type Json = Record<string, unknown>;

const asObject = (value: unknown): Json | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null);
const display = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

export type FieldChange = { field: string; before: unknown; after: unknown; kind: "added" | "removed" | "changed" };

/** The fields that differ between the two snapshots, in a stable order. */
export function diffFields(before: unknown, after: unknown): FieldChange[] {
  const b = asObject(before) ?? {};
  const a = asObject(after) ?? {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  const changes: FieldChange[] = [];
  for (const field of keys) {
    const hadBefore = field in b;
    const hasAfter = field in a;
    if (hadBefore && hasAfter && JSON.stringify(b[field]) === JSON.stringify(a[field])) continue;
    changes.push({
      field,
      before: b[field],
      after: a[field],
      kind: !hadBefore ? "added" : !hasAfter ? "removed" : "changed",
    });
  }
  return changes;
}

const KIND_LABEL: Record<FieldChange["kind"], string> = { added: "Added", removed: "Removed", changed: "Changed" };
const KIND_TONE: Record<FieldChange["kind"], "success" | "danger" | "neutral"> = { added: "success", removed: "danger", changed: "neutral" };

export function DiffView({ entry }: { entry: AuditEntryDto }) {
  const changes = diffFields(entry.before, entry.after);
  if (changes.length === 0) {
    return <p className="text-caption text-fg-secondary">No field-level detail was recorded for this action.</p>;
  }
  return (
    <table className="w-full text-caption">
      <thead>
        <tr className="text-fg-secondary text-left">
          <th scope="col" className="py-1 pr-4 font-medium">Field</th>
          <th scope="col" className="py-1 pr-4 font-medium">Change</th>
          <th scope="col" className="py-1 pr-4 font-medium">Before</th>
          <th scope="col" className="py-1 font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change) => (
          <tr key={change.field} className="border-t border-border-subtle align-top">
            <th scope="row" className="py-1 pr-4 font-mono font-normal text-fg-primary">{change.field}</th>
            <td className="py-1 pr-4">
              <Badge tone={KIND_TONE[change.kind]}>{KIND_LABEL[change.kind]}</Badge>
            </td>
            <td className="py-1 pr-4 font-mono text-fg-secondary break-all">{display(change.before)}</td>
            <td className="py-1 font-mono text-fg-primary break-all">{display(change.after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A row of the trail. Expanding it is a native `<details>`, so it works before JavaScript loads. */
export function AuditEntryRow({ entry, timestamp }: { entry: AuditEntryDto; timestamp: string }) {
  const actor = entry.actorType === "USER" ? (entry.actorName ?? "Someone") : entry.actorType === "PRINT_AGENT" ? "Print agent" : "System";
  return (
    <details className="group border-b border-border-subtle" data-testid="audit-entry">
      <summary className="flex cursor-pointer items-start gap-3 py-3 px-1 hover:bg-surface-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <IconTile icon={DOMAIN_ICONS.audit} size="sm" tone={DOMAIN_HUES.audit} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-label text-fg-primary">{entry.action}</span>
            <span className="text-caption text-fg-secondary">{entry.resourceType}</span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-caption text-fg-secondary">
            <span>{actor}</span>
            {entry.actorRole && <span>· {entry.actorRole}</span>}
            <span>· {timestamp}</span>
            {entry.ipPrefix && <span>· {entry.ipPrefix}</span>}
          </span>
          {entry.reason && <span className="mt-1 block text-caption text-fg-primary">“{entry.reason}”</span>}
        </span>
        <span className="pt-1 text-caption text-fg-secondary group-open:hidden">Show detail</span>
        <span className="hidden pt-1 text-caption text-fg-secondary group-open:inline">Hide detail</span>
      </summary>
      <div className="px-1 pb-4 pl-12">
        <DiffView entry={entry} />
      </div>
    </details>
  );
}
