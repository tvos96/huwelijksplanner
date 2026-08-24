import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-indigo text-white hover:bg-indigo-ink",
        rose: "bg-rose text-white hover:bg-rose-ink",
        outline: "border border-line bg-transparent text-ink hover:border-indigo hover:text-indigo",
        ghost: "bg-transparent text-muted hover:text-ink hover:bg-line/50",
        soft: "bg-indigo-soft text-indigo-ink hover:bg-indigo-soft/70",
      },
      size: { default: "h-10 px-5", sm: "h-8 px-3 text-xs", icon: "h-9 w-9 p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
