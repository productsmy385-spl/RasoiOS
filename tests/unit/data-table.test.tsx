import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Receipt } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/states/empty-state";

// S1-P08-T007 — DataTable structure (the responsive behaviour is checked in a browser: TC-DS-012 in
// tests/e2e/design-system.spec.ts).
type Row = { id: string; order: string; customer: string; amount: string; status: string };

const rows: Row[] = [
  { id: "1", order: "#1042", customer: "A very long customer name that keeps going well past sixty characters in total", amount: "₹1,240.50", status: "Paid" },
  { id: "2", order: "#1043", customer: "Ravi", amount: "₹80.00", status: "Unpaid" },
];

const columns: DataTableColumn<Row>[] = [
  { key: "order", header: "Order", text: (r) => r.order, sortable: true, primary: true },
  { key: "customer", header: "Customer", text: (r) => r.customer, truncate: true },
  { key: "amount", header: "Amount", text: (r) => r.amount, numeric: true, sortable: true },
  { key: "status", header: "Status", cell: (r) => <strong>{r.status}</strong> },
];

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const empty = <EmptyState icon={Receipt} title="No transactions for these dates" description="Change the dates to see earlier payments." />;

describe("DataTable", () => {
  it("right-aligns numeric columns with tabular numerals and left-aligns text", () => {
    const out = html(<DataTable caption="Transactions" columns={columns} rows={rows} getRowKey={(r) => r.id} empty={empty} />);
    expect(out).toMatch(/<th scope="col"[^>]*class="[^"]*text-right[^"]*">Amount<\/th>/);
    expect(out).toMatch(/<td class="[^"]*text-right[^"]*tabular-nums[^"]*">₹1,240.50<\/td>/);
    expect(out).toMatch(/<td class="[^"]*text-left[^"]*">#1042<\/td>/);
  });

  it("truncates long text with the full value in title", () => {
    const out = html(<DataTable caption="Transactions" columns={columns} rows={rows} getRowKey={(r) => r.id} empty={empty} />);
    expect(out).toContain(`class="block max-w-xs truncate" title="${rows[0].customer}"`);
  });

  it("sortable headers carry aria-sort and a link to the next sort (server-driven)", () => {
    const out = html(
      <DataTable
        caption="Transactions"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        empty={empty}
        sort={{ key: "amount", direction: "asc" }}
        sortHref={(key, direction) => `/restaurant/transactions?sort=${key}&dir=${direction}`}
      />,
    );
    expect(out).toMatch(/<th scope="col" aria-sort="ascending"[^>]*>.*Amount/);
    expect(out).toContain('href="/restaurant/transactions?sort=amount&amp;dir=desc"');
    expect(out).toContain('href="/restaurant/transactions?sort=order&amp;dir=asc"');
    // Only the sorted column announces a sort state.
    expect(out.match(/aria-sort=/g)).toHaveLength(1);
  });

  it("renders a card per row below 768 px with every label/value pair", () => {
    const out = html(<DataTable caption="Transactions" columns={columns} rows={rows} getRowKey={(r) => r.id} empty={empty} />);
    // Start at the <ul> itself, so its own class list (which carries md:hidden) is part of the slice.
    const cards = out.slice(out.lastIndexOf("<ul", out.indexOf('data-table-mode="cards"')));
    expect(cards).toContain("md:hidden");
    for (const header of ["Customer", "Amount", "Status"]) expect(cards).toContain(`<dt class="text-caption text-fg-secondary">${header}</dt>`);
    expect(cards).toMatch(/<dd class="[^"]*text-right tabular-nums[^"]*">₹80.00<\/dd>/);
    expect(out).toMatch(/class="hidden overflow-x-auto[^"]*md:block"/);
  });

  it("density changes the row height", () => {
    expect(html(<DataTable caption="T" columns={columns} rows={rows} getRowKey={(r) => r.id} empty={empty} />)).toContain("h-12");
    const compact = html(<DataTable caption="T" columns={columns} rows={rows} getRowKey={(r) => r.id} empty={empty} density="compact" />);
    expect(compact).toMatch(/<td class="h-10 /);
  });

  it("shows the empty slot instead of an empty table", () => {
    const out = html(<DataTable caption="Transactions" columns={columns} rows={[]} getRowKey={(r) => r.id} empty={empty} />);
    expect(out).not.toContain("<table");
    expect(out).toContain("No transactions for these dates");
  });

  it("adds a labelled actions column when row actions are given", () => {
    const out = html(<DataTable caption="Transactions" columns={columns} rows={rows} getRowKey={(r) => r.id} empty={empty} rowActions={(r) => <a href={`/x/${r.id}`}>Open</a>} />);
    expect(out).toContain('<span class="sr-only">Actions</span>');
    expect(out).toContain('href="/x/1"');
  });
});
