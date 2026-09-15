"use client";

import { useState } from "react";
import { Utensils, MapPin, Phone, Mail, Clock, ShoppingBag, Plus, Minus, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CartDrawer, CartItem } from "@/components/public/cart-drawer";

export interface PublicCategoryItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  taxRate: string;
  isAvailable: boolean;
  variants: unknown;
  addOns: unknown;
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  items: PublicCategoryItem[];
}

export interface PublicMenuProps {
  slug: string;
  restaurant: {
    name: string;
    logo: string | null;
    description: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    openingHours: unknown;
  };
  categories: PublicCategory[];
}

export function PublicMenuClient({ slug, restaurant, categories }: PublicMenuProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  function handleAddToCart(item: PublicCategoryItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          taxRate: parseFloat(item.taxRate),
          quantity: 1,
        },
      ];
    });
  }

  function handleUpdateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function handleClearCart() {
    setCart([]);
  }

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="min-h-screen bg-[#1A1715] text-[#F3F4F6] pb-24">
      {/* Restaurant Banner Header */}
      <header className="relative bg-[#24201D] border-b border-[#38322E] py-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-[#D97706] flex items-center justify-center text-white font-display text-3xl font-bold shadow-xl shadow-[#D97706]/20 shrink-0">
            {restaurant.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              restaurant.name.charAt(0)
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-[#FBF9F5]">
              {restaurant.name}
            </h1>
            {restaurant.description && (
              <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
                {restaurant.description}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-gray-400 font-mono">
              {restaurant.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                  {restaurant.address}
                </span>
              )}
              {restaurant.contactPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                  {restaurant.contactPhone}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Categories & Menu Section */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <Utensils className="w-12 h-12 mx-auto text-gray-500" />
            <p className="font-medium text-lg">Menu Coming Soon</p>
            <p className="text-xs">No active menu categories found for this restaurant.</p>
          </div>
        ) : (
          categories.map((category) => (
            <section key={category.id} className="space-y-4">
              <div className="border-b border-[#38322E] pb-2">
                <h2 className="font-display text-2xl font-bold text-[#FBF9F5]">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-xs text-gray-400 mt-1">{category.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => {
                  const cartEntry = cart.find((i) => i.id === item.id);
                  const priceNum = parseFloat(item.price);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#24201D] border border-[#38322E] hover:border-[#D97706]/30 transition flex justify-between gap-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-[#FBF9F5]">
                            {item.name}
                          </h3>
                          {!item.isAvailable && (
                            <Badge variant="destructive">Sold Out</Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <p className="font-mono text-amber-400 font-bold text-sm pt-1">
                          ${priceNum.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        {cartEntry ? (
                          <div className="flex items-center gap-2 bg-[#1A1715] p-1 rounded-xl border border-[#38322E]">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-[#24201D] hover:bg-[#38322E] flex items-center justify-center text-white"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono text-sm px-1.5 font-bold">
                              {cartEntry.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-[#D97706] hover:bg-[#B45309] flex items-center justify-center text-white"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!item.isAvailable}
                            onClick={() => handleAddToCart(item)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#D97706] hover:bg-[#B45309] text-white p-4 rounded-2xl shadow-2xl shadow-[#D97706]/40 flex items-center justify-between font-semibold transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-mono font-bold">
                {totalItemCount}
              </div>
              <span>View Order Cart</span>
            </div>
            <span className="font-mono text-lg font-bold">
              ${cartSubtotal.toFixed(2)} →
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        slug={slug}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </main>
  );
}
