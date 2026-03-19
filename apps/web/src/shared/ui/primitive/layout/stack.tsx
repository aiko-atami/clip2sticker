import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

type StackProps<T extends ElementType = "div"> = {
  as?: T;
  gap?: "xs" | "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch";
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const gapClassName: Record<NonNullable<StackProps["gap"]>, string> = {
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-8",
};

const alignClassName: Record<NonNullable<StackProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export function Stack<T extends ElementType = "div">({
  as,
  gap = "md",
  align = "stretch",
  className,
  children,
  ...props
}: StackProps<T>) {
  const Comp = as ?? "div";

  return (
    <Comp
      className={cn("flex flex-col", gapClassName[gap], alignClassName[align], className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
