import React from "react";
import { cn } from "../../lib/utils";
export const Input = React.forwardRef(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(
    "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo",
    className)} {...p} />
));
Input.displayName = "Input";
export const Textarea = React.forwardRef(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(
    "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo resize-y min-h-[46px] leading-snug",
    className)} {...p} />
));
Textarea.displayName = "Textarea";
