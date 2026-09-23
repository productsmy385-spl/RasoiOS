import type { OrderDetailDto } from "@/lib/services/orders";
import { formatMoney } from "@/lib/ui/format";

/**
 * The order's lines exactly as they were saved (frontend.md §5.3): the item and variant names, the add-ons and the
 * prices are the order's own immutable snapshots, so editing the menu afterwards never changes what a guest was
 * charged (ADR-010 §4). Money is right-aligned with tabular numerals; the kitchen's copy has no money at all, and
 * the money columns simply disappear rather than showing dashes.
 */
export function OrderLinesTable({ order, locale }: { order: OrderDetailDto; locale?: string }) {
  const showMoney = order.totalAmount !== null;
  const money = (amount: string | null) => (amount === null ? "—" : formatMoney(amount, order.currencyCode, locale));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-0 border-collapse text-body">
        <caption className="sr-only">Items on order {order.orderNumber}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-left text-label text-fg-secondary">
            <th scope="col" className="py-2 pr-3">
              Item
            </th>
            <th scope="col" className="py-2 pr-3 text-right">
              Qty
            </th>
            {showMoney && (
              <>
                <th scope="col" className="py-2 pr-3 text-right">
                  Unit
                </th>
                <th scope="col" className="py-2 pr-3 text-right">
                  Tax
                </th>
                <th scope="col" className="py-2 text-right">
                  Line total
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.id} className="border-b border-border-subtle align-top last:border-0">
              <td className="py-3 pr-3">
                <p className="text-label text-fg-primary">
                  {line.itemNameSnapshot}
                  {line.variantNameSnapshot ? ` (${line.variantNameSnapshot})` : ""}
                </p>
                {line.addons.length > 0 && (
                  <p className="text-caption text-fg-secondary">
                    {line.addons.map((addon) => `${addon.name}${addon.price === null ? "" : ` ${money(addon.price)}`}`).join(" · ")}
                  </p>
                )}
                {line.specialInstructions && <p className="mt-1 border-l-2 border-status-warning pl-2 text-caption text-status-warning">{line.specialInstructions}</p>}
              </td>
              <td className="py-3 pr-3 text-right text-numeric">{line.quantity}</td>
              {showMoney && (
                <>
                  <td className="py-3 pr-3 text-right text-numeric">{money(line.unitPriceSnapshot)}</td>
                  <td className="py-3 pr-3 text-right text-numeric">{money(line.lineTax)}</td>
                  <td className="py-3 text-right text-numeric">{money(line.lineTotal)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
