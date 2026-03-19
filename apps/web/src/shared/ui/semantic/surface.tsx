import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type SurfaceProps = {
  className?: string;
  children: ReactNode;
} & ComponentPropsWithoutRef<"section">;

export function Surface({ className, children, ...props }: SurfaceProps) {
  return (
    <section
      data-slot="surface"
      className={cn(
        "rounded-[2rem] border border-border/80 bg-card/90 shadow-soft ring-1 ring-white/50",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
