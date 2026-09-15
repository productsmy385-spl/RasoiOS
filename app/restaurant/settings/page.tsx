"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { updateRestaurantProfileAction } from "./actions";

export default function RestaurantSettingsPage() {
  const [formData, setFormData] = useState({
    name: "Taj Mahal Palace Dining",
    logo: "",
    description: "Authentic royal Indian cuisine cooked with traditional clay tandoors and aromatic spices.",
    address: "12 Apollo Bunder, Colaba, Mumbai, MH 400001",
    contactEmail: "info@tajpalacedining.com",
    contactPhone: "+91 22 6665 3366",
    openingHours: "11:30 AM – 11:00 PM Daily",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await updateRestaurantProfileAction(formData);
      setMessage({ type: "success", text: "Restaurant profile successfully updated!" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update restaurant profile";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#38322E] pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[#FBF9F5]">
            Restaurant Settings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage restaurant profile, logo URL, address, contact information, and operating hours.
          </p>
        </div>
        <Badge variant="primary">
          <Settings className="w-3.5 h-3.5" />
          Tenant Settings
        </Badge>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            message.type === "success"
              ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Branding & Profile Details</CardTitle>
          <CardDescription>
            These details are displayed on your public restaurant website (`/r/[slug]`).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Restaurant Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Logo Image URL"
                placeholder="https://images.unsplash.com/photo-..."
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Restaurant Description
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl bg-[#1A1715] border border-[#38322E] px-3.5 py-2 text-sm text-[#F3F4F6] placeholder-gray-500 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Input
              label="Physical Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Contact Email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />

              <Input
                label="Contact Phone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>

            <Input
              label="Opening Hours Display"
              placeholder="e.g. 11:30 AM – 11:00 PM Daily"
              value={formData.openingHours}
              onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
            />

            <div className="pt-4 border-t border-[#38322E] flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? "Saving Changes..." : "Save Restaurant Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
