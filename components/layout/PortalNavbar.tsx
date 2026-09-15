"use client";

import { useEffect, useState } from "react";
import { Clock, ShieldCheck, Utensils } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const rawKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isRealClerkKey = Boolean(
  rawKey &&
    !rawKey.includes("placeholder") &&
    !rawKey.includes("example.com")
);

export function PortalNavbar() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#24201D] border-b border-[#38322E] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-[#D97706] md:hidden" />
          <span className="font-display font-bold text-lg text-[#FBF9F5]">
            Restaurant Management Console
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
          <ShieldCheck className="w-3 h-3" />
          Live Instance
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1A1715] border border-[#38322E] text-xs font-mono text-gray-300">
          <Clock className="w-3.5 h-3.5 text-[#D97706]" />
          <span>{time || "00:00:00 AM"}</span>
        </div>

        {/* User Auth */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#38322E]">
          {isRealClerkKey ? (
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-lg border border-[#D97706]/40",
                },
              }}
            />
          ) : (
            <div className="px-2.5 py-1 rounded-lg bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30 text-xs font-mono font-bold">
              DEV MODE
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
