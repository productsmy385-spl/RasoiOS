import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dialog } from "@/components/ui/dialog";
import { applyFilters } from "@/components/ui/filter-bar";
import { Pagination, paginationHref } from "@/components/ui/pagination";
import { moveItem } from "@/components/ui/sortable-list";
import { Tabs } from "@/components/ui/tabs";

// S1-P08-T006 — interaction primitives: server-rendered structure and pure helpers. Keyboard behaviour (focus trap,
// Esc, arrow keys, reordering announcements) runs in a browser: TC-DS-011 in tests/e2e/design-system.spec.ts.
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("Tabs", () => {
  it("renders the ARIA tabs pattern with a roving tabindex", () => {
    const out = html(
      <Tabs
        label="Settings sections"
        items={[
          { id: "profile", label: "Profile", content: "Profile form" },
          { id: "hours", label: "Opening hours", content: "Hours editor" },
        ]}
      />,
    );
    expect(out).toContain('role="tablist" aria-label="Settings sections"');
    expect(out.match(/role="tab"/g)).toHaveLength(2);
    expect(out).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*tabindex="0"[^>]*>Profile/);
    expect(out).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*tabindex="-1"[^>]*>Opening hours/);
    expect(out).toMatch(/role="tabpanel"[^>]*hidden=""[^>]*>Hours editor/);
  });
});

describe("Dialog", () => {
  it("renders a native <dialog> with nothing inside while closed", () => {
    const out = html(
      <Dialog open={false} onClose={() => {}} title="Archive 'Starters'?">
        <p>Body</p>
      </Dialog>,
    );
    expect(out).toMatch(/^<dialog[^>]*aria-labelledby=/);
    expect(out).not.toContain("Body");
    expect(out).toContain("max-w-dialog-form");
    expect(out).toContain("rounded-3xl");
  });
});

describe("SortableList", () => {
  it("moveItem returns a new order without mutating the input", () => {
    const items = ["Starters", "Mains", "Breads", "Desserts"];
    expect(moveItem(items, 0, 2)).toEqual(["Mains", "Breads", "Starters", "Desserts"]);
    expect(moveItem(items, 3, 0)).toEqual(["Desserts", "Starters", "Mains", "Breads"]);
    expect(items).toEqual(["Starters", "Mains", "Breads", "Desserts"]);
  });
});

describe("FilterBar", () => {
  it("writes filters to the query string, drops empty values and resets the cursor", () => {
    const current = new URLSearchParams("status=NEW&cursor=abc&tab=all");
    expect(applyFilters(current, { status: "READY", q: "  1042 " })).toBe("?status=READY&tab=all&q=1042");
    expect(applyFilters(current, { status: "" })).toBe("?tab=all");
    expect(applyFilters(new URLSearchParams("cursor=abc"), { status: "" })).toBe("");
  });
});

describe("Pagination", () => {
  it("builds cursor links that keep the filters", () => {
    expect(paginationHref("/restaurant/orders", { status: "NEW" }, "c2")).toBe("/restaurant/orders?status=NEW&cursor=c2");
    expect(paginationHref("/restaurant/orders", { status: "NEW", cursor: "c2" }, null)).toBe("/restaurant/orders?status=NEW");
  });

  it("offers Next page when there is a next cursor and First page once past the first page", () => {
    const first = html(<Pagination basePath="/restaurant/orders" searchParams={{}} nextCursor="c2" />);
    expect(first).toContain('aria-label="Pagination"');
    expect(first).toContain('href="/restaurant/orders?cursor=c2"');
    expect(first).toMatch(/aria-disabled="true"[^>]*>.*First page/);
    const later = html(<Pagination basePath="/restaurant/orders" searchParams={{ cursor: "c2" }} nextCursor={null} />);
    expect(later).toContain('href="/restaurant/orders"');
    expect(later).toMatch(/aria-disabled="true"[^>]*>Next page/);
  });

  it("renders nothing when everything fits on one page", () => {
    expect(html(<Pagination basePath="/restaurant/orders" searchParams={{}} nextCursor={null} />)).toBe("");
  });
});
