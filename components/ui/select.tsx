import * as React from "react";
import { cn } from "./button";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <select
          className={cn(
            "w-full px-3.5 py-2.5 bg-[#24201D] text-[#FBF9F5] border border-[#38322E] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:border-[#D97706] transition-all disabled:opacity-50 appearance-none cursor-pointer",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
