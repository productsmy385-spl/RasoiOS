import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

// Brand fonts, self-hosted at build time by next/font: no runtime request to Google (S1-P08-T002, SC-HDR-02).
const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], display: "swap", variable: "--font-display" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RASOIOS — Restaurant Operations",
  description: "Menu management, counter ordering, kitchen tickets and thermal printing for restaurants.",
  manifest: "/manifest.json",
};

// ClerkProvider always wraps the app (S1-P03-T002). Keys are validated at server start (lib/env.ts), so there is
// no unauthenticated fallback rendering path. Brand v2 is dark everywhere the platform speaks — landing, auth,
// console, admin and kitchen; a restaurant's own public page opts into data-theme="light" (ADR-013 §6).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en" className={`dark ${display.variable} ${sans.variable}`} data-theme="dark">
        <body className="bg-canvas text-fg-primary antialiased selection:bg-action-primary selection:text-action-primary-fg">
          <PwaRegister />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
