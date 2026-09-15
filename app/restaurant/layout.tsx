import { Sidebar } from "@/components/layout/Sidebar";
import { PortalNavbar } from "@/components/layout/PortalNavbar";
import { Footer } from "@/components/layout/Footer";

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1A1715] text-[#F3F4F6] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <PortalNavbar />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
