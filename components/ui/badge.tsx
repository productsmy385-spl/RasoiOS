import * as React from "react";
import { cn } from "./button";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({
  className,
  variant = "primary",
  ...props
}: BadgeProps) {
  const variants = {
    primary:
      "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30",
    success:
      "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
    warning:
      "bg-amber-500/10 text-amber-500 border-amber-500/30",
    destructive:
      "bg-red-500/10 text-red-500 border-red-500/30",
    outline:
      "border-[#38322E] text-gray-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
