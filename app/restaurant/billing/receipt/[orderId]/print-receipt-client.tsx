"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReceiptData {
  orderNumber: string;
  createdAt: string;
  orderType: string;
  tableNumber: string | null;
  notes: string | null;
  totalAmount: string;
  restaurant: {
    name: string;
    address: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  };
  customer: {
    name: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    name: string;
    price: string;
    taxRate: string;
    quantity: number;
  }>;
  transactions: Array<{
    id: string;
    paymentMethod: string;
    amount: string;
    reference: string | null;
    createdAt: string;
  }>;
}

export function PrintReceiptClient({ data }: { data: ReceiptData }) {
  const subtotal = data.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );
  const taxTotal = data.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity * (parseFloat(item.taxRate) / 100),
    0
  );

  return (
    <main className="min-h-screen bg-[#110F0E] text-black p-4 flex flex-col items-center justify-start print:bg-white print:p-0">
      {/* Print Controls (Hidden when printing) */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-between print:hidden text-white">
        <Button
          onClick={() => window.print()}
          variant="primary"
          className="bg-amber-600 hover:bg-amber-500 font-bold w-full"
        >
          <Printer className="w-4 h-4 mr-2" /> Print Tax Invoice / Receipt
        </Button>
      </div>

      {/* Thermal Thermal Receipt Layout (80mm / 3inch width format) */}
      <div className="w-full max-w-[380px] bg-white text-black p-6 font-mono text-xs shadow-2xl rounded-lg print:shadow-none print:w-full print:max-w-none print:p-2 border border-gray-200">
        {/* Restaurant Header */}
        <div className="text-center space-y-1 pb-4 border-b border-black">
          <h1 className="text-lg font-bold font-sans uppercase tracking-wider">
            {data.restaurant.name}
          </h1>
          {data.restaurant.address && (
            <p className="text-[10px] text-gray-700 leading-tight">{data.restaurant.address}</p>
          )}
          {data.restaurant.contactPhone && (
            <p className="text-[10px] text-gray-700">Ph: {data.restaurant.contactPhone}</p>
          )}
          <p className="text-[10px] font-bold mt-2 uppercase border border-black inline-block px-2 py-0.5">
            TAX INVOICE / RECEIPT
          </p>
        </div>

        {/* Order Details */}
        <div className="py-3 border-b border-black text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="font-bold">Order #:</span>
            <span>{data.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date/Time:</span>
            <span>{new Date(data.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Order Type:</span>
            <span className="font-bold">{data.orderType}</span>
          </div>
          {data.tableNumber && (
            <div className="flex justify-between font-bold">
              <span>Table #:</span>
              <span>{data.tableNumber}</span>
            </div>
          )}
          {data.customer && (
            <div className="flex justify-between pt-1 text-[10px]">
              <span>Customer:</span>
              <span>{data.customer.name}</span>
            </div>
          )}
        </div>

        {/* Itemized Table */}
        <div className="py-3 border-b border-black space-y-2">
          <div className="flex justify-between font-bold text-[10px] uppercase tracking-wider border-b border-gray-300 pb-1">
            <span>Item</span>
            <span>Qty x Price</span>
            <span>Total</span>
          </div>

          {data.items.map((item) => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            return (
              <div key={item.id} className="space-y-0.5 text-[11px]">
                <div className="font-bold">{item.name}</div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>
                    {item.quantity} x ${parseFloat(item.price).toFixed(2)}
                  </span>
                  <span className="font-bold text-black">${itemTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Summary */}
        <div className="py-3 border-b border-black space-y-1 text-[11px]">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Tax Amount:</span>
            <span>${taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dashed border-gray-400">
            <span>GRAND TOTAL:</span>
            <span>${parseFloat(data.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Details */}
        <div className="py-3 border-b border-black text-[10px] space-y-1">
          <div className="font-bold uppercase tracking-wider text-gray-700">
            Payment Status & Method
          </div>
          {data.transactions.length === 0 ? (
            <div className="text-red-600 font-bold uppercase">UNPAID / PENDING</div>
          ) : (
            data.transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between">
                <span>{tx.paymentMethod} Payment:</span>
                <span className="font-bold">${parseFloat(tx.amount).toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 text-[10px] text-gray-700 space-y-1">
          <p className="font-bold text-black">Thank you for dining with us!</p>
          <p>Please come again.</p>
          <p className="text-[8px] text-gray-500 pt-2">Powered by RASOIOS Platform</p>
        </div>
      </div>
    </main>
  );
}
