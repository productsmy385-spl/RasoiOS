import { getPublicRestaurantBySlug, PublicRestaurantData } from "@/lib/services/public-restaurant";
import { PublicMenuClient } from "@/components/public/public-menu-client";
import { Utensils } from "lucide-react";

interface PublicRestaurantPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicRestaurantPage({ params }: PublicRestaurantPageProps) {
  const { slug } = await params;

  let restaurantData: PublicRestaurantData | null = null;
  try {
    restaurantData = await getPublicRestaurantBySlug(slug);
  } catch (error) {
    if (slug === "demo") {
      restaurantData = {
        tenantId: "demo-tenant-id",
        tenantName: "Taj Mahal Palace Dining",
        slug: "demo",
        timezone: "Asia/Kolkata",
        restaurant: {
          name: "Taj Mahal Palace Dining",
          logo: null,
          description: "Authentic royal Indian cuisine cooked with traditional clay tandoors and aromatic spices.",
          address: "12 Apollo Bunder, Colaba, Mumbai, MH 400001",
          contactEmail: "info@tajpalacedining.com",
          contactPhone: "+91 22 6665 3366",
          openingHours: "11:30 AM – 11:00 PM Daily",
        },
        categories: [
          {
            id: "cat-1",
            name: "Chef Specialties",
            description: "Signature dishes prepared by our master chefs",
            sortOrder: 1,
            items: [
              {
                id: "item-1",
                name: "Tandoori Murgh Makhani",
                description: "Tender clay-oven grilled chicken in rich butter gravy",
                imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=800",
                price: "480.00",
                taxRate: "5.00",
                isAvailable: true,
                variants: null,
                addOns: null,
              },
              {
                id: "item-2",
                name: "Hyderabadi Dum Biryani",
                description: "Fragrant basmati rice cooked on slow dum with aromatic spices",
                imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800",
                price: "520.00",
                taxRate: "5.00",
                isAvailable: true,
                variants: null,
                addOns: null,
              },
            ],
          },
          {
            id: "cat-2",
            name: "Artisanal Breads",
            description: "Freshly baked in our traditional tandoor",
            sortOrder: 2,
            items: [
              {
                id: "item-3",
                name: "Butter Garlic Naan",
                description: "Leavened flatbread brushed with fresh garlic butter",
                imageUrl: null,
                price: "95.00",
                taxRate: "5.00",
                isAvailable: true,
                variants: null,
                addOns: null,
              },
            ],
          },
        ],
      };
    }
  }

  if (!restaurantData) {
    return (
      <main className="min-h-screen bg-[#1A1715] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 mb-4">
          <Utensils className="w-10 h-10" />
        </div>
        <h1 className="font-display text-3xl font-bold text-[#FBF9F5]">Restaurant Not Found</h1>
        <p className="text-gray-400 mt-2 max-w-md">
          The requested restaurant slug &quot;{slug}&quot; could not be found or is currently inactive.
        </p>
      </main>
    );
  }

  return (
    <PublicMenuClient
      slug={slug}
      restaurant={restaurantData.restaurant}
      categories={restaurantData.categories}
    />
  );
}
