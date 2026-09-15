"use client";

import { useEffect, useState, useTransition } from "react";
import { PaymentMethod, TransactionStatus, OrderStatus } from "@prisma/client";
import { processPaymentAction, getTransactionsAction, processRefundAction } from "./actions";
import { getOrdersAction } from "@/app/restaurant/orders/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  DollarSign,
  QrCode,
  Globe,
  Receipt,
  Printer,
  RefreshCw,
  CheckCircle,
  Search,
  ArrowLeftRight,
} from "lucide-react";

interface OrderItem {
  id: string;
  itemNameSnapshot: string;
  priceSnapshot: any;
  quantity: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  orderType: string;
  status: OrderStatus;
  tableNumber: string | null;
  totalAmount: any;
  createdAt: string | Date;
  customer: { name: string; phone: string | null } | null;
  items: OrderItem[];
}

interface TransactionData {
  id: string;
  orderId: string;
  amount: any;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  referenceId: string | null;
  createdAt: string | Date;
  order: {
    orderNumber: string;
    customer: { name: string } | null;
  };
}

export default function StaffBillingPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [activeTab, setActiveTab] = useState<"UNPAID" | "TRANSACTIONS">("UNPAID");

  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [amountTendered, setAmountTendered] = useState("");
  const [txRef, setTxRef] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  function fetchData() {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const [ordersRes, txRes] = await Promise.all([
          getOrdersAction(),
          getTransactionsAction(),
        ]);

        if (ordersRes.success) {
          // Filter active orders that require payment or are ready/completed
          setOrders(ordersRes.orders as any);
        }
        if (txRes.success) {
          setTransactions(txRes.transactions as any);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load billing data");
      } finally {
        setIsLoading(false);
      }
    });
  }

  useEffect(() => {
    fetchData();
  }, []);

  const orderTotal = selectedOrder
    ? parseFloat(String(selectedOrder.totalAmount))
    : 0;
  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - orderTotal);

  async function handleSettlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;

    if (paymentMethod === PaymentMethod.CASH && tenderedNum < orderTotal) {
      setErrorMsg(`Amount tendered ($${tenderedNum.toFixed(2)}) is less than total amount ($${orderTotal.toFixed(2)})`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await processPaymentAction(selectedOrder.id, {
        amount: orderTotal.toFixed(2),
        paymentMethod,
        transactionReference: txRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`Payment of $${orderTotal.toFixed(2)} recorded successfully for ${selectedOrder.orderNumber}!`);
        // Open receipt pop-up
        window.open(`/restaurant/billing/receipt/${selectedOrder.id}`, "_blank");
        setSelectedOrder(null);
        setAmountTendered("");
        setTxRef("");
        setNotes("");
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRefundTransaction(txId: string) {
    if (!confirm("Are you sure you want to refund this transaction?")) return;
    try {
      setErrorMsg(null);
      const res = await processRefundAction(txId, "Staff initiated refund");
      if (res.success) {
        setSuccessMsg("Transaction refunded successfully.");
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to refund transaction");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3D3732] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#F3F1EE]">
              Billing & Cashier Terminal
            </h1>
            <p className="text-xs text-[#A8A29E]">
              Process guest settlements, record payments, and print tax bills
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchData}
            disabled={isLoading || isPending}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex items-center gap-4 border-b border-[#3D3732] pb-2">
        <button
          onClick={() => setActiveTab("UNPAID")}
          className={`pb-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "UNPAID"
              ? "border-[#D97706] text-[#D97706]"
              : "border-transparent text-[#A8A29E] hover:text-white"
          }`}
        >
          Orders Awaiting Settlement ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("TRANSACTIONS")}
          className={`pb-2 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "TRANSACTIONS"
              ? "border-[#D97706] text-[#D97706]"
              : "border-transparent text-[#A8A29E] hover:text-white"
          }`}
        >
          Settled Transactions Log ({transactions.length})
        </button>
      </div>

      {activeTab === "UNPAID" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const amount = parseFloat(String(order.totalAmount));
            return (
              <Card
                key={order.id}
                className="p-5 space-y-4 bg-[#24201D] border-[#3D3732] flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#3D3732] pb-3">
                    <div>
                      <div className="font-mono text-base font-bold text-amber-400">
                        {order.orderNumber}
                      </div>
                      <div className="text-xs text-[#A8A29E]">
                        {order.tableNumber ? `Table ${order.tableNumber}` : order.orderType}
                      </div>
                    </div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>

                  {/* Customer / Items preview */}
                  <div className="text-xs space-y-1 text-[#A8A29E]">
                    {order.customer && (
                      <div className="text-[#F3F1EE] font-medium">
                        Patron: {order.customer.name}
                      </div>
                    )}
                    <div className="pt-1">
                      {order.items.map((i) => (
                        <div key={i.id} className="flex justify-between text-[11px]">
                          <span>{i.quantity}x {i.itemNameSnapshot}</span>
                          <span className="font-mono">${(parseFloat(String(i.priceSnapshot)) * i.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#3D3732] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#A8A29E]">Amount Due</div>
                    <div className="font-mono text-xl font-extrabold text-emerald-400">
                      ${amount.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/restaurant/billing/receipt/${order.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[#2D2825] hover:bg-[#3D3732] text-[#A8A29E] hover:text-white rounded-lg border border-[#3D3732]"
                      title="Preview Tax Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </a>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setAmountTendered(amount.toFixed(2));
                      }}
                    >
                      Pay ${amount.toFixed(2)}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Transactions Table */
        <div className="bg-[#24201D] border border-[#3D3732] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1A1715] text-[#A8A29E] uppercase tracking-wider font-semibold border-b border-[#3D3732]">
              <tr>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-5 py-3.5">Payment Method</th>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3D3732] text-[#F3F1EE]">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#2D2825] transition-colors">
                  <td className="px-5 py-4 font-mono text-[#A8A29E]">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-amber-400">
                    {tx.order.orderNumber}
                  </td>
                  <td className="px-5 py-4 uppercase font-bold tracking-wider text-xs">
                    <span className="px-2 py-0.5 bg-[#2D2825] rounded border border-[#3D3732]">
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-[#A8A29E]">
                    {tx.referenceId || "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                    ${parseFloat(String(tx.amount)).toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Badge variant={tx.status === "SUCCESS" ? "success" : "destructive"}>
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {tx.status === "SUCCESS" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRefundTransaction(tx.id)}
                      >
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1A1715] text-[#F3F1EE] border border-[#3D3732] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3D3732] pb-4">
              <div>
                <h2 className="text-xl font-bold font-display text-white">
                  Settle Payment — {selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-[#A8A29E]">
                  Select payment channel and verify monetary total
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#A8A29E] hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-5">
              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-[#A8A29E] tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { method: "CASH", icon: DollarSign, label: "Cash" },
                    { method: "CARD", icon: CreditCard, label: "Card" },
                    { method: "UPI", icon: QrCode, label: "UPI" },
                    { method: "ONLINE", icon: Globe, label: "Online" },
                  ].map(({ method, icon: Icon, label }) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method as PaymentMethod)}
                      className={`py-3 flex flex-col items-center gap-1 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethod === method
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-500"
                          : "bg-[#24201D] text-[#A8A29E] border-[#3D3732] hover:border-[#524B45]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="p-4 bg-[#24201D] border border-[#3D3732] rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-[#A8A29E]">
                  <span>Total Bill Amount</span>
                  <span className="font-mono text-white font-bold text-sm">${orderTotal.toFixed(2)}</span>
                </div>

                {paymentMethod === "CASH" && (
                  <>
                    <div className="flex justify-between items-center pt-2 border-t border-[#3D3732]">
                      <label className="text-xs text-[#A8A29E]">Amount Tendered ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-32 text-right font-mono text-sm"
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-[#A8A29E]">Change Due</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {(paymentMethod === "CARD" || paymentMethod === "UPI" || paymentMethod === "ONLINE") && (
                  <div className="pt-2 border-t border-[#3D3732]">
                    <label className="text-xs text-[#A8A29E]">Transaction Reference / Approval Code</label>
                    <Input
                      placeholder="e.g. TXN987654321"
                      className="mt-1 text-xs"
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 py-2.5 px-6 font-bold"
                >
                  {isProcessing ? "Processing..." : `Complete Settlement — $${orderTotal.toFixed(2)}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
