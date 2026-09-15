"use client";

import { useState } from "react";
import { OrderType } from "@prisma/client";
import { submitPublicOrderAction } from "@/app/r/[slug]/checkout-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export interface CartItem {
  id: string; // menuItemId
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
}

interface CartDrawerProps {
  slug: string;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({
  slug,
  cart,
  onUpdateQuantity,
  onClearCart,
  isOpen,
  onClose,
}: CartDrawerProps) {
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    orderNumber: string;
    totalAmount: string;
  } | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalTax = cart.reduce(
    (acc, item) => acc + item.price * item.quantity * (item.taxRate / 100),
    0
  );
  const grandTotal = subtotal + totalTax;

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitPublicOrderAction(slug, {
        orderType,
        tableNumber: tableNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        items: cart.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
        })),
      });

      if (res.success) {
        setConfirmation({
          orderNumber: res.orderNumber,
          totalAmount: res.totalAmount,
        });
        onClearCart();
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to place order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setConfirmation(null);
    setErrorMsg(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setTableNumber("");
    setNotes("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1A1715] text-[#F3F1EE] border-l border-[#3D3732] flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#3D3732] flex items-center justify-between bg-[#24201D]">
          <div>
            <h2 className="font-semibold text-lg">Your Cart Order</h2>
            <p className="text-xs text-[#A8A29E]">Complete details to submit</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8A29E] hover:text-white p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {confirmation ? (
            <Card className="p-6 text-center space-y-4 bg-emerald-950/30 border-emerald-600/40">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-bold text-emerald-400">Order Placed!</h3>
              <p className="text-sm text-[#A8A29E]">
                Thank you! Your order number is:
              </p>
              <div className="text-2xl font-mono font-bold tracking-wider text-amber-400 bg-amber-950/40 py-2 rounded-lg border border-amber-500/30">
                {confirmation.orderNumber}
              </div>
              <p className="text-xs text-[#A8A29E]">
                Total Amount: <span className="font-bold text-white">${confirmation.totalAmount}</span>
              </p>
              <Button onClick={handleReset} variant="primary" className="w-full mt-4">
                Close & Return to Menu
              </Button>
            </Card>
          ) : cart.length === 0 ? (
            <div className="text-center py-12 text-[#A8A29E] space-y-2">
              <p className="text-3xl">🛒</p>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-xs">Add items from the menu to start an order.</p>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-950/40 text-red-400 border border-red-500/30 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase text-[#A8A29E] tracking-wider">
                  Items ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#24201D] border border-[#3D3732] rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-sm text-[#F3F1EE]">
                        {item.name}
                      </div>
                      <div className="text-xs text-amber-400 font-mono">
                        ${item.price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-7 h-7 bg-[#2D2825] hover:bg-[#3D3732] text-white rounded font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm px-1">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-7 h-7 bg-[#2D2825] hover:bg-[#3D3732] text-white rounded font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Options */}
              <div className="space-y-3 pt-2 border-t border-[#3D3732]">
                <h3 className="text-xs font-semibold uppercase text-[#A8A29E] tracking-wider">
                  Order Type
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(["DINE_IN", "TAKEAWAY", "DELIVERY"] as OrderType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                          orderType === type
                            ? "bg-amber-600/20 text-amber-400 border-amber-500"
                            : "bg-[#24201D] text-[#A8A29E] border-[#3D3732] hover:border-[#524B45]"
                        }`}
                      >
                        {type.replace("_", " ")}
                      </button>
                    )
                  )}
                </div>

                {orderType === "DINE_IN" && (
                  <div>
                    <label className="text-xs text-[#A8A29E]">Table Number (Optional)</label>
                    <Input
                      placeholder="e.g. Table 4"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Customer Details */}
              <div className="space-y-3 pt-2 border-t border-[#3D3732]">
                <h3 className="text-xs font-semibold uppercase text-[#A8A29E] tracking-wider">
                  Customer Information
                </h3>
                <div>
                  <label className="text-xs text-[#A8A29E]">Full Name *</label>
                  <Input
                    required
                    placeholder="Your Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#A8A29E]">Phone Number (Optional)</label>
                  <Input
                    placeholder="Mobile number for status updates"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#A8A29E]">Email Address (Optional)</label>
                  <Input
                    type="email"
                    placeholder="Email for digital receipt"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#A8A29E]">Special Instructions</label>
                  <Input
                    placeholder="Dietary requests or notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!confirmation && cart.length > 0 && (
          <div className="p-4 border-t border-[#3D3732] bg-[#24201D] space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#A8A29E]">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#A8A29E]">
                <span>Estimated Tax</span>
                <span>${totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#F3F1EE] pt-1 border-t border-[#3D3732]">
                <span>Total Amount</span>
                <span className="text-amber-400 font-mono">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              variant="primary"
              className="w-full py-3"
            >
              {isSubmitting ? "Placing Order..." : `Place Order — $${grandTotal.toFixed(2)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
