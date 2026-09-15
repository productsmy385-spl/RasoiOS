"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, Tag, Plus, Edit2, CheckCircle2, XCircle, Calendar, Sparkles } from "lucide-react";
import { CategoryModal } from "@/components/restaurant/category-modal";
import { ItemModal } from "@/components/restaurant/item-modal";
import { toggleItemAvailabilityAction } from "./items-actions";

export default function MenuManagementPage() {
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "daily">("items");

  // Sample client state initialized for demonstration
  const [categories, setCategories] = useState([
    { id: "cat-1", name: "Main Course", description: "Clay oven specialties & rich gravies", sortOrder: 1 },
    { id: "cat-2", name: "Breads & Rice", description: "Freshly baked tandoori breads & biryanis", sortOrder: 2 },
    { id: "cat-3", name: "Beverages", description: "Cooling lassis & traditional teas", sortOrder: 3 },
  ]);

  const [items, setItems] = useState([
    {
      id: "item-1",
      categoryId: "cat-1",
      categoryName: "Main Course",
      name: "Tandoori Murgh Makhani",
      description: "Tender clay-oven grilled chicken in rich butter gravy",
      price: "480.00",
      taxRate: "5.00",
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "item-2",
      categoryId: "cat-1",
      categoryName: "Main Course",
      name: "Paneer Tikka Masala",
      description: "Cottage cheese cubes tossed in spicy tandoori gravy",
      price: "420.00",
      taxRate: "5.00",
      isAvailable: true,
      imageUrl: null,
    },
    {
      id: "item-3",
      categoryId: "cat-2",
      categoryName: "Breads & Rice",
      name: "Hyderabadi Dum Biryani",
      description: "Fragrant basmati rice cooked with whole spices",
      price: "520.00",
      taxRate: "5.00",
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800",
    },
  ]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[0] | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      await toggleItemAvailabilityAction(itemId, !currentStatus);
      setItems(items.map((it) => (it.id === itemId ? { ...it, isAvailable: !currentStatus } : it)));
    } catch {
      // Local toggle fallback for UI preview
      setItems(items.map((it) => (it.id === itemId ? { ...it, isAvailable: !currentStatus } : it)));
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#38322E] pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[#FBF9F5]">Menu Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            Curate menu categories, Decimal items, availability toggles, and date-specific daily menus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "categories" ? (
            <Button onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          ) : activeTab === "items" ? (
            <Button onClick={() => { setSelectedItem(null); setIsItemModalOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Menu Item
            </Button>
          ) : null}
        </div>
      </div>

      {/* Console Tabs */}
      <div className="flex gap-2 border-b border-[#38322E]">
        <button
          onClick={() => setActiveTab("items")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "items"
              ? "border-[#D97706] text-[#D97706]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Utensils className="w-4 h-4" />
          Menu Items ({items.length})
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "categories"
              ? "border-[#D97706] text-[#D97706]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Tag className="w-4 h-4" />
          Categories ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "daily"
              ? "border-[#D97706] text-[#D97706]"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daily Menu Publishing
        </button>
      </div>

      {/* ITEMS TAB */}
      {activeTab === "items" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="glass-panel-hover flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{item.categoryName}</Badge>
                    <button
                      onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                      className="transition"
                    >
                      {item.isAvailable ? (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3" /> Unavailable
                        </Badge>
                      )}
                    </button>
                  </div>
                  <CardTitle className="mt-2">{item.name}</CardTitle>
                  {item.description && <CardDescription>{item.description}</CardDescription>}
                </CardHeader>

                <CardContent className="pt-2 border-t border-[#38322E] flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-gray-400">₹</span>
                    <span className="font-display text-xl font-bold text-[#D97706]">
                      {parseFloat(item.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono ml-1">
                      (+{item.taxRate}% Tax)
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedItem(item);
                      setIsItemModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg font-bold text-[#FBF9F5]">{cat.name}</h3>
                  <Badge variant="outline">Order #{cat.sortOrder}</Badge>
                </div>
                {cat.description && <p className="text-sm text-gray-400 mt-1">{cat.description}</p>}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedCategory(cat);
                  setIsCategoryModalOpen(true);
                }}
              >
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* DAILY MENU TAB */}
      {activeTab === "daily" && (
        <Card className="space-y-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Menu Curation</CardTitle>
                <CardDescription>Select items for today&apos;s active daily menu publishing.</CardDescription>
              </div>
              <Badge variant="success">
                <Sparkles className="w-3.5 h-3.5" /> Published for Today
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-gray-300">
              Published daily menu items are highlighted on your public website (`/r/[slug]`) and digital menu ordering interface.
            </p>

            <div className="divide-y divide-[#38322E]">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#FBF9F5]">{item.name}</p>
                    <p className="text-xs text-gray-400">₹{parseFloat(item.price).toFixed(2)}</p>
                  </div>
                  <Badge variant="success">Included in Daily Menu</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => {}}
        initialData={selectedCategory}
      />

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSuccess={() => {}}
        categories={categories}
        initialData={selectedItem}
      />
    </div>
  );
}
