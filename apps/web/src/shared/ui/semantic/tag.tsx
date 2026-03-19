import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/shared/lib/cn";

export function Tag({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/15 bg-primary/6 px-4 py-2 text-sm font-medium text-primary",
        className,
      )}
      {...props}
    />
  );
}
