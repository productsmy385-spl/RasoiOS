"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Utensils } from "lucide-react";
import { createMenuItemAction, updateMenuItemAction } from "@/app/restaurant/menu/items-actions";

interface CategoryOption {
  id: string;
  name: string;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryOption[];
  initialData?: {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    price: string;
    taxRate: string;
  } | null;
}

export function ItemModal({ isOpen, onClose, onSuccess, categories, initialData }: ItemModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("0.00");
  const [taxRate, setTaxRate] = useState("5.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.categoryId);
      setName(initialData.name);
      setDescription(initialData.description || "");
      setImageUrl(initialData.imageUrl || "");
      setPrice(initialData.price);
      setTaxRate(initialData.taxRate);
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : "");
      setName("");
      setDescription("");
      setImageUrl("");
      setPrice("0.00");
      setTaxRate("5.00");
    }
  }, [initialData, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (initialData) {
        await updateMenuItemAction({
          id: initialData.id,
          categoryId,
          name,
          description,
          imageUrl,
          price,
          taxRate,
        });
      } else {
        await createMenuItemAction({
          categoryId,
          name,
          description,
          imageUrl,
          price,
          taxRate,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save menu item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#24201D] border border-[#38322E] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#38322E] pb-4">
          <div className="flex items-center gap-2 text-[#D97706]">
            <Utensils className="w-5 h-5" />
            <h2 className="font-display text-xl font-bold text-[#FBF9F5]">
              {initialData ? "Edit Menu Item" : "Add Menu Item"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Category *</label>
            <select
              className="w-full rounded-xl bg-[#1A1715] border border-[#38322E] px-3.5 py-2 text-sm text-[#F3F4F6] focus:border-[#D97706] focus:outline-none"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input label="Item Name *" value={name} onChange={(e) => setName(e.target.value)} required />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Description</label>
            <textarea
              rows={2}
              className="w-full rounded-xl bg-[#1A1715] border border-[#38322E] px-3.5 py-2 text-sm text-[#F3F4F6] placeholder-gray-500 focus:border-[#D97706] focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹) *" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <Input label="Tax Rate (%)" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>

          <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />

          <div className="flex justify-end gap-3 pt-4 border-t border-[#38322E]">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : initialData ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
