"use client";

import Link from "next/link";
import { ShieldAlert, Building, Lock } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const rawKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isRealClerkKey = Boolean(
  rawKey &&
    !rawKey.includes("placeholder") &&
    !rawKey.includes("example.com")
);

export function SuperAdminNav() {
  return (
    <header className="h-16 bg-[#1A1715] border-b border-[#38322E] px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-[#FBF9F5] tracking-wide">
            SUPER<span className="text-red-500">ADMIN</span>
          </span>
        </Link>
        <span className="text-xs px-2.5 py-1 rounded-full bg-red-950/40 text-red-400 border border-red-500/30 font-mono">
          Platform Governance Mode
        </span>
      </div>

      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-4 text-xs font-medium">
          <Link
            href="/admin"
            className="text-gray-300 hover:text-white transition flex items-center gap-1.5"
          >
            <Building className="w-3.5 h-3.5" /> Tenants Overview
          </Link>
          <Link
            href="/admin/tenants"
            className="text-gray-300 hover:text-white transition flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" /> Platform Security
          </Link>
        </nav>

        <div className="pl-4 border-l border-[#38322E]">
          {isRealClerkKey ? (
            <UserButton afterSignOutUrl="/sign-in" />
          ) : (
            <span className="text-xs font-mono text-red-400">ADMIN DEV</span>
          )}
        </div>
      </div>
    </header>
  );
}
