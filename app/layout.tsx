import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "RASOIOS — Premium Multi-Tenant Restaurant Platform",
  description:
    "Production-grade restaurant SaaS platform with digital ordering, kitchen workflow, print agent, POS, and multi-tenant security.",
  manifest: "/manifest.json",
};

const rawKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isRealClerkKey = Boolean(
  rawKey &&
    !rawKey.includes("placeholder") &&
    !rawKey.includes("example.com")
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isRealClerkKey) {
    return (
      <html lang="en" className="dark">
        <body className="bg-[#1A1715] text-[#F3F4F6] antialiased selection:bg-[#D97706] selection:text-white">
          <PwaRegister />
          {children}
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={rawKey}>
      <html lang="en" className="dark">
        <body className="bg-[#1A1715] text-[#F3F4F6] antialiased selection:bg-[#D97706] selection:text-white">
          <PwaRegister />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
