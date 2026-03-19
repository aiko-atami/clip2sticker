import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/cn";
import { PrimitiveButton } from "@/shared/ui/primitive";

type ButtonTone = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const sizeVariant: Record<ButtonSize, ComponentProps<typeof PrimitiveButton>["size"]> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

const toneVariant: Record<ButtonTone, ComponentProps<typeof PrimitiveButton>["variant"]> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
};

export type ButtonProps = Omit<ComponentProps<typeof PrimitiveButton>, "size" | "variant"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
};

export function Button({ tone = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <PrimitiveButton
      className={cn(tone === "primary" && "shadow-[0_18px_44px_rgba(130,66,17,0.18)]", className)}
      size={sizeVariant[size]}
      variant={toneVariant[tone]}
      {...props}
    />
  );
}
