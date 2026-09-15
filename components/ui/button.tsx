import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#D97706] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-[#D97706] text-white hover:bg-[#B45309] shadow-lg shadow-[#D97706]/20 border border-[#D97706] font-semibold",
      secondary:
        "bg-[#24201D] text-[#FBF9F5] hover:bg-[#38322E] border border-[#38322E]",
      outline:
        "border border-[#D97706]/40 text-[#D97706] hover:bg-[#D97706]/10",
      ghost:
        "text-gray-300 hover:text-white hover:bg-[#24201D]",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 border border-red-500",
      glass:
        "bg-[#24201D]/80 text-[#FBF9F5] backdrop-blur-md border border-[#D97706]/30 hover:border-[#D97706] hover:bg-[#38322E] shadow-md",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2.5 font-semibold",
      icon: "h-9 w-9 p-0 rounded-lg justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
