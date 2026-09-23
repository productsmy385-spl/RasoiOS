import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DayCloseForm } from "@/components/transactions/day-close-form";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { DescriptionList, type DescriptionItem } from "@/components/ui/description-list";
import { ErrorState } from "@/components/states/error-state";
import { Icon } from "@/components/ui/icon";
import { requireTenantPage } from "@/lib/auth/guards";
import { formatBusinessDate, formatMoney } from "@/lib/ui/format";
import { businessDateFor, toIsoDate } from "@/lib/time/business-date";
import { now } from "@/lib/time/clock";
import { getDayClosePreviewAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Close the day" };

const BASE_PATH = "/restaurant/transactions/day-close";

type SearchParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const isoDate = (value: string | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);

/** `YYYY-MM-DD` shifted by whole days, without leaving the date domain. */
function shiftDate(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * `/restaurant/transactions/day-close` (S1-P18-T007; api.md LD-TXN-02, SA-TXN-04).
 *
 * The figures are read from the ledger for one business date in the restaurant's own time zone — never the viewer's
 * and never the server's. A day that is already closed renders as a read-only record instead of a form, because
 * closing it twice is not a thing the server will do and offering the button would be a lie.
 */
export default async function DayClosePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await requireTenantPage("day_close:perform");
  const params = await searchParams;

  const today = toIsoDate(businessDateFor(now(), ctx.restaurant.timezone));
  const requested = isoDate(single(params.date));
  const businessDate = requested ?? today;

  const result = await getDayClosePreviewAction({ businessDate });
  const money = (amount: string) => formatMoney(amount, ctx.restaurant.currencyCode);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <Link href="/restaurant/transactions" className="mb-4 inline-flex items-center gap-2 text-label text-fg-secondary hover:text-fg-primary">
        <Icon icon={ArrowLeft} size={18} />
        All transactions
      </Link>

      <PageHeader
        title="Close the day"
        description={`${formatBusinessDate(businessDate)} in ${ctx.restaurant.timezone}. Closing a day stops any further payment, refund or void being recorded against it.`}
        actions={
          <div className="flex items-center gap-2">
            <DayLink date={shiftDate(businessDate, -1)} label="Previous day" />
            {businessDate !== today && <DayLink date={today} label="Today" />}
          </div>
        }
      />

      {result.ok ? (
        <div className="flex flex-col gap-6">
          <Card padding="feature">
            <h2 className="text-heading text-fg-primary">What the ledger says</h2>
            <DescriptionList className="mt-4" items={ledgerItems(result.data, money)} />
          </Card>

          {result.data.alreadyClosed ? (
            <Alert tone="success" title="This day is already closed">
              Its takings are final. Anything recorded from here belongs to another business day.
            </Alert>
          ) : (
            <DayCloseForm preview={result.data} money={money} currencyCode={ctx.restaurant.currencyCode} />
          )}
        </div>
      ) : (
        <ErrorState requestId={result.error.requestId} message={result.error.message} />
      )}
    </div>
  );
}

function ledgerItems(preview: { expectedCash: string; cardTotal: string; upiTotal: string; refundTotal: string; orderCount: number; openOrderCount: number }, money: (amount: string) => string): DescriptionItem[] {
  return [
    { term: "Cash expected", value: money(preview.expectedCash) },
    { term: "Card", value: money(preview.cardTotal) },
    { term: "UPI", value: money(preview.upiTotal) },
    { term: "Refunded", value: money(preview.refundTotal) },
    { term: "Orders", value: String(preview.orderCount) },
    { term: "Still open", value: String(preview.openOrderCount) },
  ];
}

function DayLink({ date, label }: { date: string; label: string }) {
  return (
    <Link
      href={`${BASE_PATH}?date=${date}`}
      className="inline-flex h-10 items-center rounded-xl border border-border-strong bg-raised px-3 text-label text-fg-primary transition-colors duration-fast ease-standard hover:bg-border-subtle"
    >
      {label}
    </Link>
  );
}
