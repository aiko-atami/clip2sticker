import type { ReactNode } from "react";

import { Stack } from "@/shared/ui/primitive";
import { Eyebrow } from "@/shared/ui/semantic/eyebrow";
import { Surface } from "@/shared/ui/semantic/surface";

type CalloutCardProps = {
  label: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function CalloutCard({ label, title, description, action }: CalloutCardProps) {
  return (
    <Surface className="p-6 md:p-7">
      <Stack gap="sm">
        <Eyebrow>{label}</Eyebrow>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-[32rem] text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </Stack>
    </Surface>
  );
}
