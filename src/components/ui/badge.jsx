import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-line text-ink/70",
        rose: "bg-rose-soft text-rose-ink",
        amber: "bg-amber-soft text-amber-ink",
        teal: "bg-teal-soft text-teal-ink",
        indigo: "bg-indigo-soft text-indigo-ink",
        lilac: "bg-lilac-soft text-lilac-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);
export const Badge = ({ className, tone, ...p }) => (
  <span className={cn(badgeVariants({ tone }), className)} {...p} />
);
