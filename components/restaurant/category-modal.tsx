"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Tag } from "lucide-react";
import { createCategoryAction, updateCategoryAction } from "@/app/restaurant/menu/categories-actions";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: { id: string; name: string; description: string | null; sortOrder: number } | null;
}

export function CategoryModal({ isOpen, onClose, onSuccess, initialData }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setSortOrder(initialData.sortOrder);
    } else {
      setName("");
      setDescription("");
      setSortOrder(0);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (initialData) {
        await updateCategoryAction({ id: initialData.id, name, description, sortOrder });
      } else {
        await createCategoryAction({ name, description, sortOrder });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#24201D] border border-[#38322E] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#38322E] pb-4">
          <div className="flex items-center gap-2 text-[#D97706]">
            <Tag className="w-5 h-5" />
            <h2 className="font-display text-xl font-bold text-[#FBF9F5]">
              {initialData ? "Edit Menu Category" : "Add Menu Category"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Category Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Description</label>
            <textarea
              rows={2}
              className="w-full rounded-xl bg-[#1A1715] border border-[#38322E] px-3.5 py-2 text-sm text-[#F3F4F6] placeholder-gray-500 focus:border-[#D97706] focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Input
            label="Display Sort Order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[#38322E]">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : initialData ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
