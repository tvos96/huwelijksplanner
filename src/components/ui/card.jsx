import React from "react";
import { cn } from "../../lib/utils";
export const Card = ({ className, ...p }) => (
  <div className={cn("rounded-xl2 border border-line bg-paper shadow-soft", className)} {...p} />
);
export const CardHeader = ({ className, ...p }) => (
  <div className={cn("p-5 pb-2", className)} {...p} />
);
export const CardTitle = ({ className, ...p }) => (
  <h2 className={cn("text-xl font-bold tracking-tight", className)} {...p} />
);
export const CardDescription = ({ className, ...p }) => (
  <p className={cn("text-sm text-muted mt-0.5", className)} {...p} />
);
export const CardContent = ({ className, ...p }) => (
  <div className={cn("p-5 pt-3", className)} {...p} />
);
