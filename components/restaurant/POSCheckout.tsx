"use client";

import { useState } from "react";
import { OrderType } from "@prisma/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ShoppingBag, CreditCard, DollarSign, User } from "lucide-react";

export interface POSCartItem {
  id: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
}

interface POSCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  cart: POSCartItem[];
  onClearCart: () => void;
  onPlaceOrder: (orderData: {
    orderType: OrderType;
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }) => Promise<void>;
}

export function POSCheckout({
  isOpen,
  onClose,
  cart,
  onClearCart,
  onPlaceOrder,
}: POSCheckoutProps) {
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalTax = cart.reduce(
    (acc, item) => acc + item.price * item.quantity * (item.taxRate / 100),
    0
  );
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await onPlaceOrder({
        orderType,
        tableNumber: tableNumber.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClearCart();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="POS Checkout & Settlement"
      description="Review order items, tax calculation, and customer details."
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Cart Item Summary */}
        <div className="space-y-2 border-b border-[#38322E] pb-4">
          <h4 className="text-xs font-mono uppercase text-gray-400">
            Order Items ({cart.reduce((a, b) => a + b.quantity, 0)})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#24201D] text-xs"
              >
                <div>
                  <span className="font-medium text-[#F3F1EE]">{item.name}</span>
                  <span className="text-gray-400 font-mono ml-2">
                    {item.quantity} x ${item.price.toFixed(2)}
                  </span>
                </div>
                <span className="font-mono text-[#D97706] font-bold">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Details Inputs */}
        <div className="space-y-3">
          <Select
            label="Order Type"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as OrderType)}
          >
            <option value="DINE_IN">DINE_IN (Table Service)</option>
            <option value="TAKEAWAY">TAKEAWAY (Counter Pickup)</option>
            <option value="DELIVERY">DELIVERY (Home Dispatch)</option>
          </Select>

          {orderType === "DINE_IN" && (
            <Input
              label="Table Number"
              placeholder="e.g. Table 12"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Guest Name (Optional)"
              placeholder="e.g. John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              label="Phone Number (Optional)"
              placeholder="e.g. +1 555-0199"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <Input
            label="Special Instructions / Kitchen Notes"
            placeholder="e.g. Extra spicy, no onions"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Tax & Total Computation */}
        <div className="p-4 rounded-xl bg-[#24201D] border border-[#38322E] space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Calculated Tax</span>
            <span>${totalTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-[#FBF9F5] pt-2 border-t border-[#38322E]">
            <span>Grand Total</span>
            <span className="text-[#D97706] text-base">${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          className="w-full py-3 text-base font-bold"
          disabled={isSubmitting || cart.length === 0}
        >
          {isSubmitting ? "Processing Order..." : `Confirm & Place Order — $${grandTotal.toFixed(2)}`}
        </Button>
      </form>
    </Dialog>
  );
}
