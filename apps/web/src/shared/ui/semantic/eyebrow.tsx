import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/shared/lib/cn";

export function Eyebrow({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn("text-sm font-semibold tracking-[0.22em] text-primary uppercase", className)}
      {...props}
    />
  );
}
