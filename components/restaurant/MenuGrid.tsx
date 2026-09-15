"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";

export interface MenuItemData {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  taxRate: number;
  isAvailable: boolean;
  categoryName?: string;
  categoryId?: string;
}

interface MenuGridProps {
  categories: { id: string; name: string }[];
  items: MenuItemData[];
  onSelectItem?: (item: MenuItemData) => void;
  onEditItem?: (item: MenuItemData) => void;
  isPublicView?: boolean;
}

export function MenuGrid({
  categories,
  items,
  onSelectItem,
  onEditItem,
  isPublicView = false,
}: MenuGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "ALL") return true;
    return item.categoryId === selectedCategory || item.categoryName === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "ALL"
              ? "bg-[#D97706] text-white shadow-md shadow-[#D97706]/30"
              : "bg-[#24201D] text-gray-300 border border-[#38322E] hover:border-[#D97706]/40"
          }`}
        >
          All Items ({items.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? "bg-[#D97706] text-white shadow-md shadow-[#D97706]/30"
                : "bg-[#24201D] text-gray-300 border border-[#38322E] hover:border-[#D97706]/40"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Item Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400 glass-panel rounded-2xl p-8">
          <p className="text-xl mb-1">🍽️</p>
          <p className="font-medium">No items found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="glass-panel-hover flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-lg text-[#FBF9F5] leading-snug">
                    {item.name}
                  </h3>
                  <Badge variant={item.isAvailable ? "success" : "destructive"}>
                    {item.isAvailable ? "Available" : "Sold Out"}
                  </Badge>
                </div>
                {item.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#38322E]">
                <div>
                  <div className="font-mono text-lg font-bold text-[#D97706]">
                    ${item.price.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    Tax: {item.taxRate}%
                  </div>
                </div>

                {isPublicView && onSelectItem && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!item.isAvailable}
                    onClick={() => onSelectItem(item)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                )}

                {!isPublicView && onEditItem && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditItem(item)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
