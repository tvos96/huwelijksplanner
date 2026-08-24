import React from "react";
import { cn } from "../../lib/utils";
export const Progress = ({ value = 0, className, barClassName }) => (
  <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-line", className)}>
    <div className={cn("h-full rounded-full bg-indigo transition-all", barClassName)}
         style={{ width: Math.max(0, Math.min(100, value)) + "%" }} />
  </div>
);
